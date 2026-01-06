'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from 'crypto';

// ============================================
// AUDIT SCORING & ANALYSIS
// ============================================

interface FolderAuditData {
    id: string;
    learnerId: string;
    learnerName: string;
    trainingTitle: string;
    status: string;
    trainingDuration: number | null;
    hoursUsed: number;
    officialStartDate: Date | null;
    officialEndDate: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    attendanceLogs: any[];
    documents: any[];
}

function calculateFolderScore(folder: FolderAuditData): {
    overall: number;
    contract: number;
    attendance: number;
    invoice: number;
    findings: string[];
    riskLevel: string;
} {
    const findings: string[] = [];
    let contractScore = 100;
    let attendanceScore = 100;
    let invoiceScore = 100;

    // === CONTRACT SCORE ===
    // Check if essential documents exist
    const hasConvention = folder.documents.some((d: any) => d.type === 'CONVENTION' && d.status === 'VALID');
    const hasAttestation = folder.documents.some((d: any) => d.type === 'ATTESTATION_ENTREE' || d.type === 'ATTESTATION_FIN');

    if (!hasConvention) {
        contractScore -= 40;
        findings.push("CRITICAL: Convention de formation manquante ou non validée");
    }
    if (!hasAttestation) {
        contractScore -= 20;
        findings.push("WARNING: Attestation d'entrée/fin manquante");
    }
    if (!folder.officialStartDate || !folder.officialEndDate) {
        contractScore -= 15;
        findings.push("WARNING: Dates officielles de formation non renseignées");
    }

    // === ATTENDANCE SCORE ===
    const totalExpectedHours = folder.trainingDuration || 0;
    const totalLoggedHours = folder.attendanceLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) / 60; // Convert minutes to hours

    if (totalExpectedHours > 0) {
        const attendanceRatio = totalLoggedHours / totalExpectedHours;

        if (attendanceRatio < 0.5) {
            attendanceScore -= 50;
            findings.push(`CRITICAL: Seulement ${Math.round(attendanceRatio * 100)}% des heures émargées`);
        } else if (attendanceRatio < 0.8) {
            attendanceScore -= 25;
            findings.push(`WARNING: ${Math.round(attendanceRatio * 100)}% des heures émargées (< 80%)`);
        } else if (attendanceRatio > 1.2) {
            attendanceScore -= 30;
            findings.push(`ANOMALY: Heures émargées (${Math.round(totalLoggedHours)}h) > heures prévues (${totalExpectedHours}h)`);
        }
    }

    // Check for signature anomalies (rapid signatures)
    const signatureTimes = folder.attendanceLogs.map((log: any) => new Date(log.createdAt).getTime());
    for (let i = 1; i < signatureTimes.length; i++) {
        const gap = signatureTimes[i] - signatureTimes[i - 1];
        if (gap < 5000 && gap > 0) { // Less than 5 seconds between signatures
            attendanceScore -= 40;
            findings.push("FRAUD_SUSPICION: Signatures multiples en moins de 5 secondes détectées");
            break;
        }
    }

    // === INVOICE SCORE ===
    // Check coherence between contract and actual delivery
    if (folder.status === 'COMPLETED') {
        if (!folder.actualEndDate) {
            invoiceScore -= 30;
            findings.push("WARNING: Dossier terminé mais date de fin réelle non renseignée");
        }
        if (totalLoggedHours < totalExpectedHours * 0.7) {
            invoiceScore -= 40;
            findings.push("CRITICAL: Facturation potentiellement incohérente - heures réalisées < 70% du contrat");
        }
    }

    // Calculate overall score
    const overall = Math.round((contractScore + attendanceScore + invoiceScore) / 3);

    // Determine risk level
    let riskLevel = 'LOW';
    if (overall < 50) riskLevel = 'CRITICAL';
    else if (overall < 70) riskLevel = 'HIGH';
    else if (overall < 85) riskLevel = 'MEDIUM';

    return {
        overall: Math.max(0, Math.min(100, overall)),
        contract: Math.max(0, Math.min(100, contractScore)),
        attendance: Math.max(0, Math.min(100, attendanceScore)),
        invoice: Math.max(0, Math.min(100, invoiceScore)),
        findings,
        riskLevel
    };
}

function generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// ============================================
// SERVER ACTIONS
// ============================================

export async function runFolderAuditAction(folderId: string, userId?: string) {
    try {
        const folder = await (prisma as any).learnerFolder.findUnique({
            where: { id: folderId },
            include: {
                learner: { include: { organisation: true } },
                documents: true,
                attendanceLogs: true
            }
        });

        if (!folder) {
            return { success: false, error: "Dossier non trouvé" };
        }

        const auditData: FolderAuditData = {
            id: folder.id,
            learnerId: folder.learnerId,
            learnerName: `${folder.learner.firstName} ${folder.learner.lastName}`,
            trainingTitle: folder.trainingTitle || 'Non spécifié',
            status: folder.status,
            trainingDuration: folder.trainingDuration,
            hoursUsed: folder.hoursUsed,
            officialStartDate: folder.officialStartDate,
            officialEndDate: folder.officialEndDate,
            actualStartDate: folder.actualStartDate,
            actualEndDate: folder.actualEndDate,
            attendanceLogs: folder.attendanceLogs,
            documents: folder.documents
        };

        const scores = calculateFolderScore(auditData);

        // Generate integrity hash
        const hashPayload = JSON.stringify({
            folderId,
            scores,
            timestamp: new Date().toISOString(),
            documentsCount: folder.documents.length,
            attendanceCount: folder.attendanceLogs.length
        });
        const integrityHash = generateHash(hashPayload);

        // Create audit report
        const report = await (prisma as any).auditReport.create({
            data: {
                organisationId: folder.learner.organisationId,
                folderId,
                type: 'FOLDER',
                title: `Audit: ${auditData.learnerName} - ${auditData.trainingTitle}`,
                status: scores.overall >= 70 ? 'PASSED' : scores.overall >= 50 ? 'FAILED' : 'CRITICAL',
                overallScore: scores.overall,
                contractScore: scores.contract,
                attendanceScore: scores.attendance,
                invoiceScore: scores.invoice,
                aiFindings: JSON.stringify(scores.findings),
                riskLevel: scores.riskLevel,
                integrityHash,
                hashGeneratedAt: new Date(),
                generatedBy: userId
            }
        });

        // Create alerts for critical findings
        for (const finding of scores.findings) {
            const severity = finding.startsWith('CRITICAL') ? 'CRITICAL'
                : finding.startsWith('FRAUD') ? 'CRITICAL'
                    : finding.startsWith('ANOMALY') ? 'ERROR'
                        : 'WARNING';

            await (prisma as any).complianceAlert.create({
                data: {
                    reportId: report.id,
                    organisationId: folder.learner.organisationId,
                    folderId,
                    type: finding.includes('FRAUD') ? 'FRAUD_SUSPICION'
                        : finding.includes('émargé') ? 'HOUR_MISMATCH'
                            : finding.includes('manquant') ? 'MISSING_DOC'
                                : 'SIGNATURE_ANOMALY',
                    severity,
                    title: finding.split(':')[0],
                    description: finding.split(':').slice(1).join(':').trim()
                }
            });
        }

        revalidatePath('/app/audit');
        return { success: true, report, scores };
    } catch (error) {
        console.error("Folder Audit Error:", error);
        return { success: false, error: "Erreur lors de l'audit du dossier" };
    }
}

export async function runBatchAuditAction(organisationId: string, userId?: string) {
    try {
        const folders = await (prisma as any).learnerFolder.findMany({
            where: {
                learner: { organisationId },
                status: { in: ['IN_PROGRESS', 'COMPLETED'] }
            },
            include: {
                learner: true,
                documents: true,
                attendanceLogs: true
            }
        });

        let totalScore = 0;
        let criticalCount = 0;
        let passedCount = 0;
        const allFindings: string[] = [];

        for (const folder of folders) {
            const auditData: FolderAuditData = {
                id: folder.id,
                learnerId: folder.learnerId,
                learnerName: `${folder.learner.firstName} ${folder.learner.lastName}`,
                trainingTitle: folder.trainingTitle || 'Non spécifié',
                status: folder.status,
                trainingDuration: folder.trainingDuration,
                hoursUsed: folder.hoursUsed,
                officialStartDate: folder.officialStartDate,
                officialEndDate: folder.officialEndDate,
                actualStartDate: folder.actualStartDate,
                actualEndDate: folder.actualEndDate,
                attendanceLogs: folder.attendanceLogs,
                documents: folder.documents
            };

            const scores = calculateFolderScore(auditData);
            totalScore += scores.overall;

            if (scores.riskLevel === 'CRITICAL') criticalCount++;
            if (scores.overall >= 70) passedCount++;

            allFindings.push(...scores.findings.map(f => `[${folder.learner.lastName}] ${f}`));
        }

        const avgScore = folders.length > 0 ? Math.round(totalScore / folders.length) : 0;
        const integrityHash = generateHash(JSON.stringify({ organisationId, avgScore, timestamp: new Date().toISOString() }));

        const report = await (prisma as any).auditReport.create({
            data: {
                organisationId,
                type: 'BATCH',
                title: `Audit Global - ${new Date().toLocaleDateString('fr-FR')}`,
                status: avgScore >= 70 ? 'PASSED' : avgScore >= 50 ? 'FAILED' : 'CRITICAL',
                overallScore: avgScore,
                aiFindings: JSON.stringify(allFindings.slice(0, 20)), // Top 20 findings
                riskLevel: avgScore < 50 ? 'CRITICAL' : avgScore < 70 ? 'HIGH' : avgScore < 85 ? 'MEDIUM' : 'LOW',
                integrityHash,
                hashGeneratedAt: new Date(),
                generatedBy: userId
            }
        });

        revalidatePath('/app/audit');
        return {
            success: true,
            report,
            summary: {
                totalFolders: folders.length,
                avgScore,
                passedCount,
                criticalCount,
                findingsCount: allFindings.length
            }
        };
    } catch (error) {
        console.error("Batch Audit Error:", error);
        return { success: false, error: "Erreur lors de l'audit global" };
    }
}

export async function getAuditReportsAction(organisationId: string) {
    try {
        const reports = await (prisma as any).auditReport.findMany({
            where: { organisationId },
            include: { alerts: true },
            orderBy: { generatedAt: 'desc' },
            take: 50
        });

        return { success: true, reports };
    } catch (error) {
        console.error("Get Audit Reports Error:", error);
        return { success: false, error: "Erreur lors de la récupération des rapports" };
    }
}

export async function getComplianceAlertsAction(organisationId: string, status?: string) {
    try {
        const alerts = await (prisma as any).complianceAlert.findMany({
            where: {
                organisationId,
                ...(status ? { status } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return { success: true, alerts };
    } catch (error) {
        console.error("Get Alerts Error:", error);
        return { success: false, error: "Erreur lors de la récupération des alertes" };
    }
}

export async function resolveAlertAction(alertId: string, resolution: string, userId: string) {
    try {
        const alert = await (prisma as any).complianceAlert.update({
            where: { id: alertId },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedBy: userId,
                resolution
            }
        });

        revalidatePath('/app/audit');
        return { success: true, alert };
    } catch (error) {
        console.error("Resolve Alert Error:", error);
        return { success: false, error: "Erreur lors de la résolution" };
    }
}

export async function getAuditDashboardStatsAction(organisationId: string) {
    try {
        const [reports, alerts, folders] = await Promise.all([
            (prisma as any).auditReport.findMany({ where: { organisationId }, take: 100 }),
            (prisma as any).complianceAlert.findMany({ where: { organisationId } }),
            (prisma as any).learnerFolder.count({ where: { learner: { organisationId } } })
        ]);

        const openAlerts = alerts.filter((a: any) => a.status === 'OPEN');
        const criticalAlerts = openAlerts.filter((a: any) => a.severity === 'CRITICAL');
        const latestReport = reports[0];

        return {
            success: true,
            stats: {
                totalFolders: folders,
                totalReports: reports.length,
                openAlerts: openAlerts.length,
                criticalAlerts: criticalAlerts.length,
                avgComplianceScore: latestReport?.overallScore || 0,
                lastAuditDate: latestReport?.generatedAt || null,
                riskLevel: latestReport?.riskLevel || 'UNKNOWN'
            }
        };
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return { success: false, error: "Erreur lors du calcul des statistiques" };
    }
}
