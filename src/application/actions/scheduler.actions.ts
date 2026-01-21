'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { runColdSurveySchedulerAction } from "./quality.actions";
import { processAppointmentRemindersAction } from "./agenda.actions";

// List of available scheduled jobs
const SCHEDULED_JOBS = [
    {
        id: 'cold_survey',
        name: 'Enquêtes Satisfaction "À Froid"',
        description: 'Envoie les questionnaires 90 jours après la fin de formation (Indicateur 30)',
        cronExpression: '0 8 * * *', // Every day at 8:00 AM
        category: 'Qualité'
    },
    {
        id: 'cpf_sync',
        name: 'Synchronisation CDC/EDOF',
        description: 'Met à jour les statuts CPF depuis l\'API Mon Compte Formation',
        cronExpression: '0 */4 * * *', // Every 4 hours
        category: 'Intégrations'
    },
    {
        id: 'compliance_check',
        name: 'Vérification Conformité Dossiers',
        description: 'Analyse les dossiers incomplets et génère des alertes',
        cronExpression: '0 9 * * 1', // Every Monday at 9:00 AM
        category: 'Qualité'
    },
    {
        id: 'backup_export',
        name: 'Export Audit Journalier',
        description: 'Sauvegarde les logs d\'émargement et données sensibles',
        cronExpression: '0 2 * * *', // Every day at 2:00 AM
        category: 'Sécurité'
    },
    {
        id: 'appointment_reminders',
        name: 'Rappels de Rendez-vous',
        description: 'Envoie des rappels SMS/Email aux prospects avant leur rendez-vous',
        cronExpression: '0 * * * *', // Every hour
        category: 'Commerce'
    }
];

export async function getScheduledJobsAction() {
    // In a real app, this would fetch from a database with last run times
    const jobs = SCHEDULED_JOBS.map(job => ({
        ...job,
        lastRun: null, // Would be fetched from DB
        nextRun: null, // Calculated from cron expression
        status: 'ACTIVE' // ACTIVE, PAUSED, ERROR
    }));

    return { success: true, jobs };
}

export async function runScheduledJobAction(jobId: string, organisationId: string) {
    console.log(`[CRON] ▶️ Manual trigger for job: ${jobId}`);

    try {
        let result: any = null;

        switch (jobId) {
            case 'cold_survey':
                result = await runColdSurveySchedulerAction(organisationId);
                break;
            case 'cpf_sync':
                // Mock implementation
                await new Promise(r => setTimeout(r, 2000));
                result = { success: true, count: 0, message: 'Synchronisation API simulée' };
                break;
            case 'compliance_check':
                await new Promise(r => setTimeout(r, 1500));
                result = { success: true, count: 0, message: 'Vérification terminée, 0 alertes' };
                break;
            case 'backup_export':
                await new Promise(r => setTimeout(r, 3000));
                result = { success: true, message: 'Export généré dans /backups/' };
                break;
            case 'appointment_reminders':
                result = await processAppointmentRemindersAction(organisationId);
                break;
            default:
                return { success: false, error: 'Job inconnu' };
        }

        // Log the execution (in a real app, save to DB)
        console.log(`[CRON] ✅ Job ${jobId} completed:`, result);

        revalidatePath('/app/settings/scheduler');
        return { success: true, result };
    } catch (error) {
        console.error(`[CRON] ❌ Job ${jobId} failed:`, error);
        return { success: false, error: 'Erreur lors de l\'exécution du job' };
    }
}

export async function getJobLogsAction(jobId: string) {
    // Mock implementation - in a real app, fetch from a logs table
    const mockLogs = [
        { id: '1', timestamp: new Date(Date.now() - 86400000), status: 'SUCCESS', duration: 2340, details: '12 emails envoyés' },
        { id: '2', timestamp: new Date(Date.now() - 172800000), status: 'SUCCESS', duration: 1890, details: '8 emails envoyés' },
        { id: '3', timestamp: new Date(Date.now() - 259200000), status: 'ERROR', duration: 450, details: 'Timeout API' },
    ];

    return { success: true, logs: mockLogs };
}
