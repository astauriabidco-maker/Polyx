import { prisma } from '@/lib/prisma';
import { addMinutes, startOfDay, endOfDay, isWithinInterval, addDays, format, getHours } from 'date-fns';
import { GeocodingService } from './geocoding.service';
import { AILogisticsService } from './ai-logistics.service';

export class AgendaIntelligenceService {
    /**
     * Finds the best time slots for a meeting in an agency with AI weighting.
     */
    static async suggestOptimalSlots(orgId: string, agencyId: string, durationMinutes: number = 45, targetLeadId?: string) {
        console.log(`[AGENDA-AI] 🔍 Finding optimal slots for Agency: ${agencyId}${targetLeadId ? ` (Lead: ${targetLeadId})` : ''}`);

        // 1. Get all collaborators in this agency
        const collaborators = await prisma.userAgency.findMany({
            where: { agencyId },
            include: { user: true }
        });

        if (collaborators.length === 0) return [];

        // 2. Prep AI Context for Lead
        let targetLead: any = null;
        let leadCoords: { lat: number, lng: number } | null = null;
        if (targetLeadId) {
            targetLead = await (prisma as any).lead.findUnique({ where: { id: targetLeadId } });
            if (targetLead?.street && targetLead?.city) {
                const geo = await GeocodingService.geocode(`${targetLead.street}, ${targetLead.zipCode} ${targetLead.city}`);
                if (geo) leadCoords = { lat: geo.lat, lng: geo.lng };
            }
        }

        const today = new Date();
        const searchRange = [addDays(today, 1), addDays(today, 2), addDays(today, 3)]; // Next 3 days
        const workingHours = { start: 9, end: 18 };

        const allSuggestions: any[] = [];

        for (const day of searchRange) {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            const events = await (prisma as any).calendarEvent.findMany({
                where: {
                    organisationId: orgId,
                    agencyId,
                    start: { gte: dayStart },
                    end: { lte: dayEnd },
                    status: { not: 'CANCELLED' }
                }
            });

            for (const colab of collaborators) {
                let currentSlot = addMinutes(dayStart, workingHours.start * 60);
                const endLimit = addMinutes(dayStart, workingHours.end * 60);
                let colabDaySlotsCount = 0;

                while (addMinutes(currentSlot, durationMinutes) <= endLimit && colabDaySlotsCount < 3) {
                    const slotInterval = { start: currentSlot, end: addMinutes(currentSlot, durationMinutes) };

                    const isBusy = (events as any[]).some((e: any) =>
                        e.userId === colab.userId && (
                            isWithinInterval(slotInterval.start, { start: e.start, end: e.end }) ||
                            isWithinInterval(slotInterval.end, { start: e.start, end: e.end }) ||
                            (e.start >= slotInterval.start && e.end <= slotInterval.end)
                        )
                    );

                    if (!isBusy) {
                        // AI WEIGHTING LOGIC
                        let aiScore = 0.5;
                        let aiInsights: string[] = [];

                        if (leadCoords) {
                            // Find closest event in time to this slot for this collaborator
                            const prevEvent = (events as any[]).filter(e => e.userId === colab.userId && e.end <= slotInterval.start)
                                .sort((a, b) => b.end.getTime() - a.end.getTime())[0];

                            if (prevEvent?.metadata?.lat && prevEvent?.metadata?.lng) {
                                const dist = AILogisticsService.calculateDistance(leadCoords, { lat: prevEvent.metadata.lat, lng: prevEvent.metadata.lng });
                                const time = AILogisticsService.estimateTravelTime(dist);

                                // Penalty or boost based on proximity
                                if (time < 15) {
                                    aiScore += 0.3;
                                    aiInsights.push('📍 Optimisation trajet: Très proche du RDV précédent');
                                } else if (time > 45) {
                                    aiScore -= 0.2;
                                    aiInsights.push('⚠️ Trajet long prévu');
                                }
                            }
                        }

                        const convProb = AILogisticsService.predictConversionProbability(targetLead);
                        if (convProb > 0.7) {
                            aiScore += 0.1;
                            aiInsights.push('🔥 Lead à fort potentiel');
                        }

                        const hour = getHours(slotInterval.start);
                        if (hour >= 10 && hour <= 12) {
                            aiScore += 0.1;
                            aiInsights.push('⏰ Créneau "Prime Time"');
                        }

                        allSuggestions.push({
                            userId: colab.userId,
                            userName: colab.user.firstName + ' ' + colab.user.lastName,
                            start: slotInterval.start,
                            end: slotInterval.end,
                            aiScore,
                            aiInsights,
                            label: `${format(slotInterval.start, 'HH:mm')} - ${format(slotInterval.end, 'HH:mm')}`,
                            dayLabel: format(slotInterval.start, 'EEEE d MMMM', { locale: (require('date-fns/locale')).fr })
                        });
                        colabDaySlotsCount++;
                    }
                    currentSlot = addMinutes(currentSlot, 30);
                }
            }
        }

        // Sort by AI Score
        return allSuggestions.sort((a, b) => b.aiScore - a.aiScore).slice(0, 8);
    }

    /**
     * Analyzes if an agency is reaching saturation for meetings
     */
    static async analyzeAgencySaturation(agencyId: string) {
        const today = new Date();
        const weekEnd = addDays(today, 7);

        const events = await (prisma as any).calendarEvent.count({
            where: {
                agencyId,
                start: { gte: today },
                end: { lte: weekEnd },
                status: 'SCHEDULED'
            }
        });

        const intensity = events > 20 ? 'HIGH' : events > 10 ? 'MEDIUM' : 'LOW';
        return {
            eventCount: events,
            intensity,
            message: intensity === 'HIGH' ? 'Forte affluence prévue cette semaine. Pensez à mobiliser des renforts.' : 'Flux de rendez-vous maîtrisé.'
        };
    }
}
