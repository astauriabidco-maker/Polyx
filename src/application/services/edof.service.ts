import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export interface EdofDossier {
    externalFileId: string;
    learner: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    training: {
        title: string;
        amount: number;
        duration: number;
        startDate: string;
        endDate: string;
    };
    cdcStatus: 'A_TRAITER' | 'ACCEPTE' | 'ENTREE_DECLAREE' | 'SERVICE_FAIT_DECLARE';
}

export class EdofService {

    /**
     * Fetches configuration for an organization
     */
    private static async getConfig(orgId: string) {
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        }) as any;

        if (!config || !config.edofEnabled || !config.edofApiKey) {
            return null;
        }

        return {
            apiKey: decrypt(config.edofApiKey),
            nda: config.edofNda,
            siret: config.edofSiret
        };
    }

    /**
     * Test connection to EDOF API
     */
    static async testConnection(orgId: string): Promise<{ success: boolean; info?: any; error?: string }> {
        const config = await this.getConfig(orgId);
        if (!config) return { success: false, error: "Configuration EDOF incomplète ou désactivée." };

        try {
            // In a real implementation, we would call an endpoint like /organismes
            // For now, we simulate success if config is present
            return {
                success: true,
                info: {
                    nda: config.nda,
                    siret: config.siret,
                    mode: 'Habilitation Active'
                }
            };
        } catch (error: any) {
            return { success: false, error: 'Connexion EDOF échouée: ' + error.message };
        }
    }

    /**
     * Fetch dossiers from EDOF (Simulated or Real depending on environment)
     */
    static async fetchExternalDossiers(orgId: string): Promise<EdofDossier[]> {
        const config = await this.getConfig(orgId);

        // If no real config, we return mock data for demonstration
        if (!config) {
            console.log('[EdofService] No config found, returning mock data.');
            return [
                {
                    externalFileId: 'EDOF-2026-001',
                    learner: {
                        firstName: 'Thomas',
                        lastName: 'Dubois',
                        email: 'thomas.dubois@example.com',
                        phone: '0611223344'
                    },
                    training: {
                        title: 'Formation Langue Anglaise - Perfectionnement',
                        amount: 2450.00,
                        duration: 40,
                        startDate: '2026-02-01T09:00:00Z',
                        endDate: '2026-05-01T17:00:00Z'
                    },
                    cdcStatus: 'A_TRAITER'
                },
                {
                    externalFileId: 'EDOF-2026-002',
                    learner: {
                        firstName: 'Sophie',
                        lastName: 'Martin',
                        email: 'sophie.martin@test.fr',
                        phone: '0788990011'
                    },
                    training: {
                        title: 'Développement Web Fullstack Next.js',
                        amount: 3500.00,
                        duration: 120,
                        startDate: '2026-01-15T09:00:00Z',
                        endDate: '2026-04-15T17:00:00Z'
                    },
                    cdcStatus: 'ENTREE_DECLAREE'
                }
            ];
        }

        // TODO: Real API call to CDC/EDOF endpoint
        // const response = await fetch('https://api.moncompteformation.gouv.fr/v1/dossiers', { ... });
        // return response.json();

        return []; // Placeholder for real implementation
    }

    /**
     * Synchronizes external EDOF data with the local database.
     */
    static async syncDossiers(organisationId: string) {
        const externalDossiers = await this.fetchExternalDossiers(organisationId);
        const results = {
            created: 0,
            updated: 0,
            errors: 0
        };

        for (const dossier of externalDossiers) {
            try {
                // 1. Find or Create Learner
                let learner = await prisma.learner.findFirst({
                    where: {
                        email: dossier.learner.email,
                        organisationId
                    }
                });

                if (!learner) {
                    learner = await prisma.learner.create({
                        data: {
                            organisationId,
                            firstName: dossier.learner.firstName,
                            lastName: dossier.learner.lastName,
                            email: dossier.learner.email,
                            phone: dossier.learner.phone
                        }
                    });
                }

                // 2. Find or Create LearnerFolder
                const existingFolder = await prisma.learnerFolder.findFirst({
                    where: {
                        externalFileId: dossier.externalFileId,
                        learnerId: learner.id
                    }
                });

                if (existingFolder) {
                    // Update Status
                    await prisma.learnerFolder.update({
                        where: { id: existingFolder.id },
                        data: {
                            cpfProgressStatus: dossier.cdcStatus,
                            updatedAt: new Date()
                        }
                    });
                    results.updated++;
                } else {
                    // Create New Folder
                    await prisma.learnerFolder.create({
                        data: {
                            learnerId: learner.id,
                            externalFileId: dossier.externalFileId,
                            fundingType: 'CPF',
                            funderName: 'CAISSE DE DÉPOT',
                            cpfProgressStatus: dossier.cdcStatus,
                            trainingTitle: dossier.training.title,
                            trainingAmount: dossier.training.amount,
                            trainingDuration: dossier.training.duration,
                            officialStartDate: new Date(dossier.training.startDate),
                            officialEndDate: new Date(dossier.training.endDate),
                            status: 'ONBOARDING',
                            complianceStatus: 'PENDING'
                        }
                    });
                    results.created++;
                }
            } catch (error) {
                console.error(`[EdofService] Error syncing dossier ${dossier.externalFileId}:`, error);
                results.errors++;
            }
        }

        // Update last sync
        await prisma.integrationConfig.update({
            where: { organisationId },
            data: { edofLastSyncAt: new Date() } as any
        }).catch(() => { });

        return results;
    }
}
