'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================
// STRATEGIC REPORTING (Cockpit V3)
// ============================================

export async function generateStrategicReportAction(organisationId: string, period: string) {
    console.log(`[STRATEGY] 🧠 Generating report for ${period}...`);

    try {
        // 1. Gather Data (Simulated for speed)
        // In real life, query Leads, Invoices, AttendanceLogs

        // Mock Predictive Finance
        const currentPipelineValue = 85000;
        const projectedRevenue = 145000;
        const confidenceScore = 87;

        // Mock Risks
        const risks = [
            {
                type: 'REVENUE_GAP',
                severity: 'MEDIUM',
                label: 'Écart Prévisionnel Q1',
                currentValue: '120k€',
                targetValue: '150k€',
                trend: 'DOWN',
                description: 'Le pipeline commercial est en retard de 15% par rapport aux objectifs.'
            },
            {
                type: 'ATTENDANCE_DROP',
                severity: 'LOW',
                label: 'Taux Assiduité Agence Paris',
                currentValue: '88%',
                targetValue: '95%',
                trend: 'STABLE',
                description: 'Léger fléchissement de la présence sur les groupes du Lundi.'
            }
        ];

        // Mock Evidence
        const evidence = [
            { category: 'SUCCESS_RATE', label: 'Taux Réussite Certification', value: 94.5, unit: 'PERCENT', source: 'Jury 2025' },
            { category: 'SATISFACTION', label: 'Satisfaction Apprenants', value: 4.8, unit: 'COUNT', source: 'QCM Fin' },
            { category: 'INSERTION', label: 'Insertion à 6 mois', value: 82.0, unit: 'PERCENT', source: 'Enquête' },
        ];

        // 2. AI Analysis (Simulated)
        const executiveSummary = `
## Synthèse CODIR - ${period}

La trajectoire de croissance reste **solide** (+12% vs N-1), soutenue par une excellente performance pédagogique (94.5% de réussite).

Cependant, un **point de vigilance** est à noter sur le pipeline commercial Q2 qui montre un léger ralentissement. Il est recommandé d'intensifier les actions marketing sur le segment B2B pour compenser.

**Recommandation Clé :** Activer une campagne de relance sur les prospects "Chauds" identifiés par le CRM (+25 potentiels) pour sécuriser le prévisionnel.
        `.trim();

        // 3. Save to DB
        const report = await (prisma as any).strategicReport.create({
            data: {
                organisationId,
                period,
                type: 'MONTHLY',
                currentPipelineValue,
                projectedRevenue,
                confidenceScore,
                riskScore: 35, // Low-Medium
                executiveSummary,
                strategicRecommendations: "1. Relance Pipeline\n2. Audit Assiduité Paris",
                marketBenchmark: JSON.stringify({ pricePosition: "ABOVE_MARKET", qualityPosition: "LEADER" }),

                risks: {
                    create: risks
                },
                evidence: {
                    create: evidence
                }
            },
            include: { risks: true, evidence: true }
        });

        revalidatePath('/app/settings/reporting');
        return { success: true, report };

    } catch (error) {
        console.error("Strategic Report Error:", error);
        return { success: false, error: "Erreur lors de la génération du rapport stratégique" };
    }
}

export async function getLatestStrategicReportAction(organisationId: string) {
    try {
        const report = await (prisma as any).strategicReport.findFirst({
            where: { organisationId },
            orderBy: { createdAt: 'desc' },
            include: { risks: true, evidence: true }
        });

        return { success: true, report };
    } catch (error) {
        console.error("Get Strategic Report Error:", error);
        return { success: false, error: "Erreur de chargement du rapport" };
    }
}
