
import { prisma } from '@/lib/prisma';

export interface IntegrationConfigData {
    averageCartValue: number;
    roiThresholdHigh: number;
    roiThresholdLow: number;
}

export interface AgencyMappingData {
    externalAgencyId: string;
    internalAgencyId: string;
}

export class ProviderConfigService {

    // Default fallback values if no config exists
    private static DEFAULTS = {
        averageCartValue: 1500,
        roiThresholdHigh: 5.0,
        roiThresholdLow: 1.0
    };

    /**
     * Fetch configuration for an organization.
     * Creates default config if it doesn't exist.
     */
    static async getConfig(organisationId: string): Promise<IntegrationConfigData> {
        let config = await prisma.integrationConfig.findUnique({
            where: { organisationId }
        });

        if (!config) {
            config = await prisma.integrationConfig.create({
                data: {
                    organisationId,
                    ...this.DEFAULTS
                }
            });
        }

        return {
            averageCartValue: config.averageCartValue,
            roiThresholdHigh: config.roiThresholdHigh,
            roiThresholdLow: config.roiThresholdLow
        };
    }

    /**
     * Update configuration parameters.
     */
    static async updateConfig(organisationId: string, data: Partial<IntegrationConfigData>) {
        return await prisma.integrationConfig.upsert({
            where: { organisationId },
            create: {
                organisationId,
                ...this.DEFAULTS,
                ...data
            },
            update: data
        });
    }

    /**
     * Get mapped internal agency ID for an external ID.
     * Returns null if no mapping found.
     */
    static async getMappedAgencyId(organisationId: string, externalId: string): Promise<string | null> {
        const mapping = await prisma.agencyMapping.findUnique({
            where: {
                organisationId_externalAgencyId: {
                    organisationId,
                    externalAgencyId: externalId
                }
            }
        });
        return mapping ? mapping.internalAgencyId : null;
    }

    /**
     * Create or Update an agency mapping.
     */
    static async setAgencyMapping(organisationId: string, externalId: string, internalId: string) {
        return await prisma.agencyMapping.upsert({
            where: {
                organisationId_externalAgencyId: {
                    organisationId,
                    externalAgencyId: externalId
                }
            },
            create: {
                organisationId,
                externalAgencyId: externalId,
                internalAgencyId: internalId
            },
            update: {
                internalAgencyId: internalId
            }
        });
    }

    /**
     * List all mappings for an organization.
     */
    static async getAllMappings(organisationId: string) {
        return await prisma.agencyMapping.findMany({
            where: { organisationId },
            orderBy: { externalAgencyId: 'asc' }
        });
    }

    /**
     * Delete a mapping.
     */
    static async deleteMapping(organisationId: string, externalId: string) {
        return await prisma.agencyMapping.delete({
            where: {
                organisationId_externalAgencyId: {
                    organisationId,
                    externalAgencyId: externalId
                }
            }
        });
    }
}
