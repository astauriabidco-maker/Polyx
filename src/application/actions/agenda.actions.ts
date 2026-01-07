'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { GoogleCalendarService } from '@/application/services/google-calendar.service';

export async function getAgendaEventsAction(orgId: string, agencyId?: string, userId?: string) {
    try {
        const events = await (prisma as any).calendarEvent.findMany({
            where: {
                organisationId: orgId,
                ...(agencyId && { agencyId }),
                ...(userId && { userId })
            },
            include: {
                user: true,
                lead: true,
                agency: true
            },
            orderBy: { start: 'asc' }
        });

        return { success: true, data: events };
    } catch (error) {
        console.error('[AgendaAction] Error fetching events:', error);
        return { success: false, error: 'Failed to fetch agenda events' };
    }
}

export async function createAppointmentAction(data: {
    organisationId: string;
    agencyId?: string;
    leadId?: string;
    userId: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    type?: string;
}) {
    try {
        console.log(`[AgendaAction] 🆕 Creating appointment: ${data.title}`);

        // Basic collision check (optional, but good for "intelligence")
        const collision = await (prisma as any).calendarEvent.findFirst({
            where: {
                userId: data.userId,
                OR: [
                    {
                        start: { lte: data.start },
                        end: { gt: data.start }
                    },
                    {
                        start: { lt: data.end },
                        end: { gte: data.end }
                    }
                ]
            }
        });

        if (collision) {
            return {
                success: false,
                error: 'Collision détectée : Le collaborateur a déjà un rendez-vous sur ce créneau.'
            };
        }

        const event = await (prisma as any).calendarEvent.create({
            data: {
                ...data,
                status: 'SCHEDULED'
            }
        });

        // 🆕 Google Calendar Sync Trigger
        const user = await (prisma as any).user.findUnique({
            where: { id: data.userId },
            select: { googleRefreshToken: true }
        });

        if (user?.googleRefreshToken) {
            console.log(`[AgendaAction] 🔄 Triggering Google Sync for event ${event.id}`);
            await GoogleCalendarService.syncEvent(event.id, user.googleRefreshToken);
        }

        revalidatePath('/app/agenda');
        return { success: true, data: event };
    } catch (error) {
        console.error('[AgendaAction] Error creating appointment:', error);
        return { success: false, error: 'Failed to create appointment' };
    }
}

export async function updateAppointmentStatusAction(eventId: string, status: string) {
    try {
        const updated = await (prisma as any).calendarEvent.update({
            where: { id: eventId },
            data: { status }
        });
        revalidatePath('/app/agenda');
        return { success: true, data: updated };
    } catch (error) {
        console.error('[AgendaAction] Error updating status:', error);
        return { success: false, error: 'Failed to update appointment status' };
    }
}

export async function getAgencyCollaboratorsAction(agencyId: string) {
    try {
        const users = await prisma.userAgency.findMany({
            where: { agencyId },
            include: { user: true }
        });
        return { success: true, data: users.map(ua => ua.user) };
    } catch (error) {
        console.error('[AgendaAction] Error fetching collaborators:', error);
        return { success: false, error: 'Failed to fetch collaborators' };
    }
}

// ============================================
// AGENDA ANALYTICS
// ============================================

export async function getAgendaStatsAction(orgId: string, agencyId?: string) {
    try {
        const filter = {
            organisationId: orgId,
            ...(agencyId && { agencyId }),
            start: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)) // Future events
            }
        };

        const totalEvents = await (prisma as any).calendarEvent.count({ where: filter });

        const byType = await (prisma as any).calendarEvent.groupBy({
            by: ['type'],
            where: filter,
            _count: true
        });

        const byUser = await (prisma as any).calendarEvent.groupBy({
            by: ['userId'],
            where: filter,
            _count: true,
            orderBy: { _count: { userId: 'desc' } },
            take: 5
        });

        // Enrich user data
        const topUsers = await Promise.all(byUser.map(async (u: any) => {
            const user = await prisma.user.findUnique({ where: { id: u.userId! }, select: { firstName: true, lastName: true } });
            return {
                userId: u.userId,
                name: user ? `${user.firstName} ${user.lastName}` : 'Inconnu',
                count: u._count
            };
        }));

        return {
            success: true,
            data: {
                totalEvents,
                byType,
                topUsers
            }
        };
    } catch (error) {
        console.error('[AgendaAction] Error fetching stats:', error);
        return { success: false, error: 'Failed to fetch agenda stats' };
    }
}

// ============================================
// GOOGLE CALENDAR LINKING
// ============================================

/**
 * Saves a refresh token for a user to enable Google Calendar Sync.
 * In a real app, this would be the final step of an OAuth redirect flow.
 */
export async function linkGoogleCalendarAction(userId: string, refreshToken: string) {
    try {
        await (prisma as any).user.update({
            where: { id: userId },
            data: { googleRefreshToken: refreshToken }
        });
        return { success: true };
    } catch (error) {
        console.error('[AgendaAction] Error linking Google Calendar:', error);
        return { success: false, error: 'Failed to link Google Calendar' };
    }
}
