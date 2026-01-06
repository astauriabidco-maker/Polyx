'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from 'crypto';

// ============================================
// BPF ENGINE
// ============================================

export async function generateBPFReportAction(organisationId: string, year: number) {
    console.log(`[BPF] 📊 Generating report for ${year}...`);

    try {
        // 1. Fetch relevant data
        // For simulation, we'll mock some data aggregation based on real LearnerFolders
        // In reality, this would query Invoices, LearnerFolders, and User roles extensively

        // Mocking aggregation logic for now to show the concept
        // Real implementation requires joining Invoices table which we haven't fully spec'd yet

        // Get all completed folders for the year
        const folders = await (prisma as any).learnerFolder.findMany({
            where: {
                learner: { organisationId },
                status: { in: ['COMPLETED', 'IN_PROGRESS'] },
                updatedAt: {
                    gte: new Date(`${year}-01-01`),
                    lte: new Date(`${year}-12-31`)
                }
            },
            include: { learner: true }
        });

        // Simulate Cadre Data calculation
        const totalTrainees = folders.length;
        const totalHours = folders.reduce((sum: number, f: any) => sum + (f.hoursUsed || 0), 0);

        // Mock revenue (assume 15€/h avg)
        const estimatedRevenue = totalHours * 15;

        // Create or Update BPF Report
        const reportData = {
            organisationId,
            year,
            status: 'DRAFT',

            // CADRE C (Financial) - Simulated distribution
            totalRevenue: estimatedRevenue,
            cpfRevenue: estimatedRevenue * 0.6, // 60% CPF
            opcoRevenue: estimatedRevenue * 0.3, // 30% OPCO
            poleEmploiRevenue: estimatedRevenue * 0.1, // 10% Pôle Emploi
            companyRevenue: 0,

            // CADRE E (Trainees)
            totalTrainees,
            cpfTrainees: Math.floor(totalTrainees * 0.6),
            opcoTrainees: Math.floor(totalTrainees * 0.3),
            otherTrainees: Math.ceil(totalTrainees * 0.1),

            // CADRE F (Hours)
            totalHours,
            cpfHours: totalHours * 0.6,
            opcoHours: totalHours * 0.3,
            otherHours: totalHours * 0.1,

            // CADRE G (Staff) - Mock
            internalTrainers: 2,
            externalTrainers: 5
        };

        // Run Logic Checks (AI Consistency)
        const logicChecks = runBPFLogicChecks(reportData);

        // Upsert Report
        const report = await (prisma as any).bpfReport.upsert({
            where: {
                organisationId_year: {
                    organisationId,
                    year
                }
            },
            update: {
                ...reportData,
                aiConsistency: JSON.stringify(logicChecks.checks),
                riskLevel: logicChecks.riskLevel
            },
            create: {
                ...reportData,
                aiConsistency: JSON.stringify(logicChecks.checks),
                riskLevel: logicChecks.riskLevel
            }
        });

        // Create Alerts
        await (prisma as any).bpfAlert.deleteMany({ where: { reportId: report.id } });

        for (const alert of logicChecks.alerts) {
            await (prisma as any).bpfAlert.create({
                data: {
                    reportId: report.id,
                    type: alert.type,
                    severity: alert.severity,
                    message: alert.message
                }
            });
        }

        revalidatePath('/app/bpf');
        return { success: true, report, logicChecks };

    } catch (error) {
        console.error("BPF Generation Error:", error);
        return { success: false, error: "Erreur lors de la génération du BPF" };
    }
}

function runBPFLogicChecks(data: any) {
    const checks = [];
    const alerts = [];
    let riskLevel = 'LOW';

    // Check 1: Revenue vs Hours Ratio (Avg Hourly Rate)
    const avgRate = data.totalHours > 0 ? data.totalRevenue / data.totalHours : 0;

    if (avgRate > 150) {
        alerts.push({
            type: 'RATIO_ANOMALY',
            severity: 'WARNING',
            message: `Prix moyen horaire anormalement élevé (${Math.round(avgRate)}€/h). Moyenne secteur: 15-50€/h`
        });
        riskLevel = 'MEDIUM';
    } else if (avgRate < 5 && data.totalHours > 0) {
        alerts.push({
            type: 'RATIO_ANOMALY',
            severity: 'WARNING',
            message: `Prix moyen horaire suspect (${Math.round(avgRate)}€/h). Vérifiez les heures déclarées.`
        });
    }

    // Check 2: CPF Dependency
    const cpfDependency = data.totalRevenue > 0 ? data.cpfRevenue / data.totalRevenue : 0;
    if (cpfDependency > 0.8) {
        alerts.push({
            type: 'DEPENDENCY_RISK',
            severity: 'INFO',
            message: `Forte dépendance aux fonds CPF (${Math.round(cpfDependency * 100)}%). Risque stratégique en cas d'évolution réglementaire.`
        });
    }

    // Check 3: Staffing Coherence
    const totalTrainers = data.internalTrainers + data.externalTrainers;
    const hoursPerTrainer = totalTrainers > 0 ? data.totalHours / totalTrainers : 0;

    if (hoursPerTrainer > 1500) {
        alerts.push({
            type: 'RATIO_ANOMALY',
            severity: 'CRITICAL',
            message: `Volume horaire par formateur irréaliste (${Math.round(hoursPerTrainer)}h/formateur). Risque de requalification.`
        });
        riskLevel = 'HIGH';
    }

    checks.push({ name: 'Cohérence Financière', status: riskLevel === 'LOW' ? 'OK' : 'WARNING' });

    return { checks, alerts, riskLevel };
}

export async function getBPFReportsAction(organisationId: string) {
    try {
        const reports = await (prisma as any).bpfReport.findMany({
            where: { organisationId },
            include: { alerts: true },
            orderBy: { year: 'desc' }
        });
        return { success: true, reports };
    } catch (error) {
        console.error("Get BPF Reports Error:", error);
        return { success: false, error: "Erreur lors de la récupération des rapports" };
    }
}

export async function generateBPFSynthesisAction(reportId: string) {
    try {
        const report = await (prisma as any).bpfReport.findUnique({
            where: { id: reportId }
        });

        if (!report) return { success: false, error: "Rapport introuvable" };

        // Simulate Gemini Synthesis
        const synthesis = `
**Synthèse Stratégique BPF ${report.year}**

**1. Dynamique d'Activité**
L'organisme affiche un chiffre d'affaires de ${report.totalRevenue}€ pour un volume de ${report.totalHours} heures de formation. La productivité horaire moyenne s'établit à ${Math.round(report.totalRevenue / Math.max(1, report.totalHours))}€/h, un indicateur ${report.totalRevenue / report.totalHours > 50 ? 'performant' : 'standard'}.

**2. Structure de Financement**
Le modèle économique repose majoritairement sur ${report.cpfRevenue > report.opcoRevenue ? 'les fonds CPF' : 'les financements OPCO'}, ce qui traduit une orientation ${report.cpfRevenue > report.opcoRevenue ? 'B2C' : 'B2B/Corporative'}.

**3. Points d'Attention**
${JSON.parse(report.aiConsistency || '[]').map((c: any) => `- ${c.name}: ${c.status}`).join('\n')}

**Conclusion AI**
Globalement, l'activité est ${report.riskLevel === 'LOW' ? 'saine et cohérente' : 'nécessite une vigilance sur les ratios déclarés'}. Ce BPF présente un niveau de risque ${report.riskLevel} vis-à-vis d'un contrôle DRIEETS.
        `;

        const updated = await (prisma as any).bpfReport.update({
            where: { id: reportId },
            data: { aiSynthesis: synthesis }
        });

        revalidatePath('/app/bpf');
        return { success: true, synthesis };

    } catch (error) {
        console.error("BPF Synthesis Error:", error);
        return { success: false, error: "Erreur lors de la génération de la synthèse" };
    }
}

export async function validateBPFReportAction(reportId: string, userId: string) {
    try {
        const report = await (prisma as any).bpfReport.findUnique({
            where: { id: reportId }
        });

        // Generate Integrity Hash
        const hashPayload = JSON.stringify({
            id: reportId,
            data: report,
            validatedBy: userId,
            timestamp: new Date().toISOString()
        });
        const integrityHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

        const updated = await (prisma as any).bpfReport.update({
            where: { id: reportId },
            data: {
                status: 'VALIDATED',
                integrityHash,
                submissionDate: new Date()
            }
        });

        revalidatePath('/app/bpf');
        return { success: true, report: updated };

    } catch (error) {
        console.error("BPF Validation Error:", error);
        return { success: false, error: "Erreur lors de la validation" };
    }
}
