'use server';

import { prisma } from '@/lib/prisma';
import { AIService } from '@/application/services/ai.service';
import { revalidatePath } from 'next/cache';

interface CallAnalysis {
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    objections: string[];
    summary: string;
    keyPoints: string[];
    buyingSignals: string[];
    analyzedAt: string;
}

/**
 * Analyzes a single call using AI and stores the results
 */
export async function analyzeCallAction(callId: string) {
    try {
        const call = await prisma.call.findUnique({
            where: { id: callId },
            include: { lead: { include: { organisation: true } } }
        });

        if (!call) {
            return { success: false, error: 'Call not found' };
        }

        if (!call.notes || call.notes.trim().length === 0) {
            return { success: false, error: 'No notes to analyze' };
        }

        const orgId = call.lead.organisationId;
        const analysis = await AIService.analyzeCall(orgId, call.notes);

        // Store analysis in call record
        const updatedCall = await prisma.call.update({
            where: { id: callId },
            data: {
                aiAnalysis: {
                    ...analysis,
                    analyzedAt: new Date().toISOString()
                }
            }
        });

        revalidatePath('/app/leads');
        return { success: true, analysis: updatedCall.aiAnalysis };
    } catch (error: any) {
        console.error('Analyze Call Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Gets aggregated AI insights for all calls of a lead
 */
export async function getLeadCallInsightsAction(leadId: string) {
    try {
        const calls = await prisma.call.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' }
        });

        // Aggregate insights across all analyzed calls
        const analyzedCalls = calls.filter(c => c.aiAnalysis);

        if (analyzedCalls.length === 0) {
            return {
                success: true,
                insights: null,
                message: 'No analyzed calls yet'
            };
        }

        // Count sentiments
        const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
        const allObjections: Record<string, number> = {};
        const allBuyingSignals: Record<string, number> = {};

        for (const call of analyzedCalls) {
            const analysis = call.aiAnalysis as unknown as CallAnalysis;

            // Count sentiment
            if (analysis.sentiment) {
                sentimentCounts[analysis.sentiment]++;
            }

            // Aggregate objections
            for (const obj of (analysis.objections || [])) {
                allObjections[obj] = (allObjections[obj] || 0) + 1;
            }

            // Aggregate buying signals
            for (const sig of (analysis.buyingSignals || [])) {
                allBuyingSignals[sig] = (allBuyingSignals[sig] || 0) + 1;
            }
        }

        // Determine dominant sentiment
        const dominantSentiment = Object.entries(sentimentCounts)
            .sort((a, b) => b[1] - a[1])[0][0] as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

        // Sort objections by frequency
        const topObjections = Object.entries(allObjections)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Sort buying signals by frequency
        const topBuyingSignals = Object.entries(allBuyingSignals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            success: true,
            insights: {
                totalCalls: calls.length,
                analyzedCalls: analyzedCalls.length,
                dominantSentiment,
                sentimentBreakdown: sentimentCounts,
                topObjections,
                topBuyingSignals,
                lastAnalyzedAt: (analyzedCalls[0].aiAnalysis as unknown as CallAnalysis).analyzedAt
            }
        };
    } catch (error: any) {
        console.error('Get Lead Insights Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk analyze all unanalyzed calls for a lead
 */
export async function bulkAnalyzeCallsAction(leadId: string) {
    try {
        const calls = await prisma.call.findMany({
            where: {
                leadId,
                notes: { not: null },
                aiAnalysis: null
            },
            include: { lead: { include: { organisation: true } } }
        });

        if (calls.length === 0) {
            return { success: true, analyzed: 0, message: 'No calls to analyze' };
        }

        let analyzed = 0;
        for (const call of calls) {
            if (call.notes && call.notes.trim().length > 0) {
                const analysis = await AIService.analyzeCall(call.lead.organisationId, call.notes);
                await prisma.call.update({
                    where: { id: call.id },
                    data: {
                        aiAnalysis: {
                            ...analysis,
                            analyzedAt: new Date().toISOString()
                        }
                    }
                });
                analyzed++;
            }
        }

        revalidatePath('/app/leads');
        return { success: true, analyzed };
    } catch (error: any) {
        console.error('Bulk Analyze Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get calls with their AI analysis for a lead
 */
export async function getCallsWithAnalysisAction(leadId: string) {
    try {
        const calls = await prisma.call.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            include: { caller: { select: { firstName: true, lastName: true } } }
        });

        return {
            success: true,
            calls: calls.map(c => ({
                id: c.id,
                duration: c.duration,
                outcome: c.outcome,
                notes: c.notes,
                createdAt: c.createdAt,
                caller: c.caller,
                aiAnalysis: c.aiAnalysis as unknown as CallAnalysis | null
            }))
        };
    } catch (error: any) {
        console.error('Get Calls Error:', error);
        return { success: false, error: error.message };
    }
}
