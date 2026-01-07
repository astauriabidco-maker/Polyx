'use server';

import { prisma } from '@/lib/prisma';
import { WalletService } from '@/application/services/wallet.service';
import { revalidatePath } from 'next/cache';

/**
 * Get wallet balance and recent transactions
 */
export async function getWalletDataAction(orgId: string) {
    try {
        const wallet = await WalletService.getOrCreate(orgId);
        const transactions = await WalletService.getTransactions(orgId, 20);

        return {
            success: true,
            data: {
                balance: wallet.balance,
                currency: wallet.currency,
                transactions: transactions.map((t: any) => ({
                    id: t.id,
                    amount: t.amount,
                    type: t.type,
                    reference: t.reference,
                    createdAt: t.createdAt.toISOString()
                }))
            }
        };
    } catch (error: any) {
        console.error('[getWalletDataAction]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Simulate a top-up (for prototype/testing)
 * In production, this would be triggered by a Stripe webhook
 */
export async function simulateTopUpAction(orgId: string, amount: number) {
    try {
        if (amount <= 0 || amount > 1000) {
            return { success: false, error: "Montant invalide (1€ - 1000€)" };
        }

        await WalletService.credit(
            orgId,
            amount,
            `Rechargement manuel de ${amount.toFixed(2)}€`,
            { source: 'manual_simulation', timestamp: new Date().toISOString() }
        );

        revalidatePath('/app/settings/billing');
        revalidatePath('/app/settings/integrations');

        return { success: true };
    } catch (error: any) {
        console.error('[simulateTopUpAction]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Simulate usage debit (for testing)
 */
export async function simulateUsageAction(orgId: string, amount: number, description: string) {
    try {
        await WalletService.debit(orgId, amount, description);
        revalidatePath('/app/settings/billing');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
