'use server';

import { AccountingExportService, ExportFormat } from '@/application/services/accounting-export.service';

const exportService = new AccountingExportService();

export async function downloadAccountingExportAction(
    orgId: string,
    format: ExportFormat,
    startDateStr: string, // YYYY-MM-DD
    endDateStr: string    // YYYY-MM-DD
) {
    try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // Adjust endDate to end of day
        endDate.setHours(23, 59, 59, 999);

        const csvContent = await exportService.generateExport(orgId, format, startDate, endDate);

        return {
            success: true,
            data: csvContent,
            filename: `export_${format.toLowerCase()}_${startDateStr}_${endDateStr}.csv`
        };
    } catch (error: any) {
        console.error("Export Error:", error);
        return { success: false, error: "Erreur lors de la génération de l'export." };
    }
}
