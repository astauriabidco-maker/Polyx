import { prisma } from '@/lib/prisma';
import { addMinutes, startOfDay, endOfDay, isWithinInterval, addDays, format } from 'date-fns';

export class AgendaIntelligenceService {
    /**
     * Finds the best time slots for a meeting in an agency
     */
    static async suggestOptimalSlots(orgId: string, agencyId: string, durationMinutes: number = 45) {
        console.log(`[AGENDA-AI] 🔍 Finding optimal slots for Agency: ${agencyId}`);

        // 1. Get all collaborators in this agency
        const collaborators = await prisma.userAgency.findMany({
            where: { agencyId },
            include: { user: true }
        });

        if (collaborators.length === 0) return [];

        const today = new Date();
        const searchRange = [addDays(today, 1), addDays(today, 2), addDays(today, 3)]; // Next 3 days
        const workingHours = { start: 9, end: 18 }; // 9 AM to 6 PM

        const suggestions: any[] = [];

        for (const day of searchRange) {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            // Get all events for all collaborators on this day
            const events = await (prisma as any).calendarEvent.findMany({
                where: {
                    organisationId: orgId,
                    agencyId,
                    start: { gte: dayStart },
                    end: { lte: dayEnd },
                    status: { not: 'CANCELLED' }
                }
            });

            // For each collaborator, find free slots
            for (const colab of collaborators) {
                let currentSlot = addMinutes(dayStart, workingHours.start * 60);
                const endLimit = addMinutes(dayStart, workingHours.end * 60);

                while (addMinutes(currentSlot, durationMinutes) <= endLimit) {
                    const slotInterval = { start: currentSlot, end: addMinutes(currentSlot, durationMinutes) };

                    const isBusy = (events as any[]).some((e: any) =>
                        e.userId === colab.userId && (
                            isWithinInterval(slotInterval.start, { start: e.start, end: e.end }) ||
                            isWithinInterval(slotInterval.end, { start: e.start, end: e.end }) ||
                            (e.start >= slotInterval.start && e.end <= slotInterval.end)
                        )
                    );

                    if (!isBusy) {
                        suggestions.push({
                            userId: colab.userId,
                            userName: colab.user.firstName + ' ' + colab.user.lastName,
                            start: slotInterval.start,
                            end: slotInterval.end,
                            label: `${format(slotInterval.start, 'HH:mm')} - ${format(slotInterval.end, 'HH:mm')}`,
                            dayLabel: format(slotInterval.start, 'EEEE d MMMM', { locale: (require('date-fns/locale')).fr })
                        });

                        // Limit to top 2 per collaborator per day to avoid noise
                        if (suggestions.filter(s => s.userId === colab.userId && s.dayLabel === suggestions[suggestions.length - 1].dayLabel).length >= 2) break;
                    }

                    currentSlot = addMinutes(currentSlot, 30); // Check every 30 mins
                }
            }
        }

        return suggestions.slice(0, 6); // Top 6 suggestions
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
