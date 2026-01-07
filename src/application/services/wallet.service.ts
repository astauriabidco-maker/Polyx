

import { prisma } from '@/lib/prisma';

export class WalletService {

    /**
     * Get or create wallet for an organisation
     */
    static async getOrCreate(orgId: string) {
        let wallet = await (prisma as any).wallet.findUnique({
            where: { organisationId: orgId }
        });

        if (!wallet) {
            wallet = await (prisma as any).wallet.create({
                data: {
                    organisationId: orgId,
                    balance: 0.0,
                    currency: 'EUR'
                }
            });
        }

        return wallet;
    }

    /**
     * Get current balance
     */
    static async getBalance(orgId: string): Promise<number> {
        const wallet = await this.getOrCreate(orgId);
        return wallet.balance;
    }

    /**
     * Credit wallet (deposit/top-up)
     */
    static async credit(orgId: string, amount: number, reference: string, metadata?: Record<string, any>) {
        if (amount <= 0) throw new Error("Amount must be positive");

        const wallet = await this.getOrCreate(orgId);

        // Update balance and create transaction atomically
        const [updatedWallet] = await prisma.$transaction([
            (prisma as any).wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } }
            }),
            (prisma as any).walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: amount,
                    type: 'DEPOSIT',
                    reference,
                    metadata: metadata || undefined
                }
            })
        ]);

        return updatedWallet;
    }

    /**
     * Debit wallet (usage consumption)
     * Throws error if insufficient funds
     */
    static async debit(orgId: string, amount: number, reference: string, metadata?: Record<string, any>) {
        if (amount <= 0) throw new Error("Amount must be positive");

        const wallet = await this.getOrCreate(orgId);

        if (wallet.balance < amount) {
            throw new Error(`Solde insuffisant. Disponible: ${wallet.balance.toFixed(2)}€, Requis: ${amount.toFixed(2)}€`);
        }

        // Update balance and create transaction atomically
        const [updatedWallet] = await prisma.$transaction([
            (prisma as any).wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } }
            }),
            (prisma as any).walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: -amount, // Negative for debit
                    type: 'USAGE',
                    reference,
                    metadata: metadata || undefined
                }
            })
        ]);

        return updatedWallet;
    }

    /**
     * Get transaction history
     */
    static async getTransactions(orgId: string, limit = 50) {
        const wallet = await (prisma as any).wallet.findUnique({
            where: { organisationId: orgId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: limit
                }
            }
        });

        return wallet?.transactions || [];
    }
}
