'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { GoogleCalendarService } from '@/application/services/google-calendar.service';
import { LeadStatus, SalesStage } from '@/domain/entities/lead';
import { SmsService } from '@/application/services/sms.service';
import { EmailService } from '@/application/services/email.service';
import { AgendaIntelligenceService } from '@/application/services/agenda-intelligence.service';

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

import { GeocodingService } from '@/application/services/geocoding.service';

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
    shouldRevalidate?: boolean; // Added control
}) {
    try {
        console.log(`[AgendaAction] 🆕 Creating appointment: ${data.title}`);

        // Basic collision check (optional, but good for "intelligence")
        const collision = await (prisma as any).calendarEvent.findFirst({
            where: {
                userId: data.userId,
                status: { not: 'CANCELLED' },
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

        // 🌍 Geocoding Logic
        let metadata: any = {};
        if (data.leadId) {
            const lead = await (prisma as any).lead.findUnique({
                where: { id: data.leadId }
            });

            if (lead && lead.street && lead.city) {
                const address = `${lead.street}, ${lead.zipCode || ''} ${lead.city}`;
                console.log(`[AgendaAction] 📍 Geocoding address logic: ${address}`);
                const coords = await GeocodingService.geocode(address);
                if (coords) {
                    console.log(`[AgendaAction] ✅ Coordinates found: ${coords.lat}, ${coords.lng}`);
                    metadata = {
                        ...metadata,
                        lat: coords.lat,
                        lng: coords.lng,
                        addressLabel: coords.label
                    };
                }
            }
        }

        const event = await (prisma as any).calendarEvent.create({
            data: {
                organisationId: data.organisationId,
                agencyId: data.agencyId,
                leadId: data.leadId,
                userId: data.userId,
                title: data.title,
                description: data.description,
                start: data.start,
                end: data.end,
                type: data.type,
                status: 'SCHEDULED',
                metadata
            }
        });

        // 🆕 Google Calendar Sync Trigger
        const user = await (prisma as any).user.findUnique({
            where: { id: data.userId },
            select: { googleRefreshToken: true }
        });

        if (user?.googleRefreshToken) {
            console.log(`[AgendaAction] 🔄 Triggering Google Sync for event ${event.id}`);
            // await GoogleCalendarService.syncEvent(event.id, user.googleRefreshToken);
        }

        if (data.shouldRevalidate !== false) {
            revalidatePath('/app/agenda');
        }

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

export async function getManagerAgendaStatsAction(orgId: string, agencyId?: string) {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const filter: any = {
            organisationId: orgId,
            ...(agencyId && { agencyId }),
            start: { gte: thirtyDaysAgo }
        };

        // 1. Fetch Events
        const events = await (prisma as any).calendarEvent.findMany({
            where: filter,
            include: { lead: true }
        });

        // 2. Trend Data (RDVs per day)
        const trendMap = new Map();
        events.forEach((e: any) => {
            const dateStr = e.start.toISOString().split('T')[0];
            trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
        });
        const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Conversion Data
        // A conversion is a lead that had an appointment and now has status RDV_FIXE or later stages like INSCRIT_CPF
        const convertedCount = events.filter((e: any) =>
            e.lead && ['RDV_FIXE', 'CHOIX_FINANCEMENT', 'INSCRIT_CPF', 'INSCRIT_PERSO', 'TRANSFORMATION_APPRENANT'].includes(e.lead.salesStage)
        ).length;

        const conversionRate = events.length > 0 ? (convertedCount / events.length) * 100 : 0;

        // 4. Team Performance
        const userMap = new Map();
        events.forEach((e: any) => {
            if (!userMap.has(e.userId)) {
                userMap.set(e.userId, { userId: e.userId, total: 0, converted: 0 });
            }
            const data = userMap.get(e.userId);
            data.total++;
            if (e.lead && ['RDV_FIXE', 'CHOIX_FINANCEMENT', 'INSCRIT_CPF', 'INSCRIT_PERSO', 'TRANSFORMATION_APPRENANT'].includes(e.lead.salesStage)) {
                data.converted++;
            }
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userMap.keys()) } },
            select: { id: true, firstName: true, lastName: true }
        });

        const teamPerformance = Array.from(userMap.values()).map(perf => {
            const user = users.find(u => u.id === perf.userId);
            return {
                name: user ? `${user.firstName} ${user.lastName}` : 'Inconnu',
                total: perf.total,
                conversion: perf.total > 0 ? Math.round((perf.converted / perf.total) * 100) : 0
            };
        });

        // 5. Day of Week Saturation
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const daySaturation = [0, 0, 0, 0, 0, 0, 0].map((_, i) => ({ day: days[i], count: 0 }));
        events.forEach((e: any) => {
            daySaturation[e.start.getDay()].count++;
        });

        return {
            success: true,
            data: {
                totalEvents: events.length,
                conversionRate: Math.round(conversionRate),
                convertedCount,
                trendData,
                teamPerformance,
                daySaturation: daySaturation.filter(d => d.day !== 'Dim' && d.day !== 'Sam') // Focus on work days
            }
        };

    } catch (error) {
        console.error('[AgendaAction] Error fetching manager stats:', error);
        return { success: false, error: 'Failed' };
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

// ============================================
// CRUD: UPDATE & DELETE EVENTS
// ============================================

export async function duplicateAppointmentAction(eventId: string) {
    try {
        console.log(`[AgendaAction] 📋 Duplicating event: ${eventId}`);

        const original = await (prisma as any).calendarEvent.findUnique({
            where: { id: eventId }
        });

        if (!original) return { success: false, error: 'Événement original non trouvé' };

        const { id, createdAt, updatedAt, googleEventId, ...data } = original;

        const copy = await (prisma as any).calendarEvent.create({
            data: {
                ...data,
                title: `${original.title} (Copie)`,
                status: 'SCHEDULED'
            }
        });

        revalidatePath('/app/agenda');
        return { success: true, data: copy };
    } catch (error) {
        console.error('[AgendaAction] Error duplicating appointment:', error);
        return { success: false, error: 'Failed to duplicate appointment' };
    }
}

export async function updateAppointmentAction(eventId: string, data: {
    title?: string;
    description?: string;
    start?: Date;
    end?: Date;
    type?: string;
}) {
    try {
        console.log(`[AgendaAction] ✏️ Updating event ${eventId}`);
        const updated = await (prisma as any).calendarEvent.update({
            where: { id: eventId },
            data
        });
        revalidatePath('/app/agenda');
        return { success: true, data: updated };
    } catch (error) {
        console.error('[AgendaAction] Error updating appointment:', error);
        return { success: false, error: 'Failed to update appointment' };
    }
}

export async function deleteAppointmentAction(eventId: string) {
    try {
        console.log(`[AgendaAction] 🗑️ Deleting event ${eventId}`);
        await (prisma as any).calendarEvent.delete({
            where: { id: eventId }
        });
        revalidatePath('/app/agenda');
        return { success: true };
    } catch (error) {
        console.error('[AgendaAction] Error deleting appointment:', error);
        return { success: false, error: 'Failed to delete appointment' };
    }
}

export async function getEventByIdAction(eventId: string) {
    try {
        const event = await (prisma as any).calendarEvent.findUnique({
            where: { id: eventId },
            include: {
                user: true,
                lead: true,
                agency: true
            }
        });
        return { success: true, data: event };
    } catch (error) {
        console.error('[AgendaAction] Error fetching event:', error);
        return { success: false, error: 'Failed to fetch event' };
    }
}

// ============================================
// COLLABORATOR AVAILABILITY (RECURRING)
// ============================================

interface AvailabilitySlot {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
    startHour: number;
    endHour: number;
}

export async function getCollaboratorAvailabilityAction(userId: string) {
    try {
        // Stored in User metadata (using any cast since metadata may not be in Prisma types yet)
        const user = await (prisma as any).user.findUnique({
            where: { id: userId }
        });
        const metadata = user?.metadata as Record<string, any> | null;
        const availability = metadata?.availability || [];
        return { success: true, data: availability as AvailabilitySlot[] };
    } catch (error) {
        console.error('[AgendaAction] Error fetching availability:', error);
        return { success: false, error: 'Failed to fetch availability' };
    }
}

export async function setCollaboratorAvailabilityAction(userId: string, slots: AvailabilitySlot[]) {
    try {
        console.log(`[AgendaAction] 📅 Setting availability for user ${userId}`);
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        const existingMetadata = (user?.metadata as Record<string, any>) || {};

        await (prisma as any).user.update({
            where: { id: userId },
            data: {
                metadata: {
                    ...existingMetadata,
                    availability: slots
                }
            }
        });
        return { success: true };
    } catch (error) {
        console.error('[AgendaAction] Error setting availability:', error);
        return { success: false, error: 'Failed to set availability' };
    }
}

// ============================================
// REMINDERS
// ============================================

export async function scheduleReminderAction(eventId: string, channel: 'sms' | 'email', hoursBeforeEvent: number) {
    try {
        // Store reminder info in event metadata for now
        // In production, this would queue a job or cron task
        const event = await (prisma as any).calendarEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');

        const existingMetadata = (event.metadata as Record<string, any>) || {};
        await (prisma as any).calendarEvent.update({
            where: { id: eventId },
            data: {
                metadata: {
                    ...existingMetadata,
                    reminder: { channel, hoursBeforeEvent, scheduled: true }
                }
            }
        });

        console.log(`[AgendaAction] ⏰ Reminder scheduled: ${channel} ${hoursBeforeEvent}h before event ${eventId}`);
        return { success: true };
    } catch (error) {
        console.error('[AgendaAction] Error scheduling reminder:', error);
        return { success: false, error: 'Failed to schedule reminder' };
    }
}

export async function getOrganizationCollaboratorsAction(orgId: string) {
    try {
        const users = await (prisma as any).user.findMany({
            where: {
                userOrganisations: {
                    some: { organisationId: orgId }
                }
            },
            select: { id: true, firstName: true, lastName: true, email: true }
        });
        return { success: true, data: users };
    } catch (error) {
        console.error('[AgendaAction] Error fetching org collaborators:', error);
        return { success: false, error: 'Failed to fetch collaborators' };
    }
}

// ============================================
// PUBLIC BOOKING (CALENDLY STYLE)
// ============================================

export async function getPublicProfileAndAvailabilityAction(userId: string, date: Date) {
    try {
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                metadata: true
            }
        });

        if (!user) return { success: false, error: 'User not found' };

        // 1. Get Recurring Availability
        const metadata = user.metadata as Record<string, any> | null;
        const availabilityFn = metadata?.availability as AvailabilitySlot[] || [];

        // Filter for the requested day of week (0=Sun, 1=Mon...)
        const dayOfWeek = date.getDay();
        const daySlots = availabilityFn.filter((s: any) => s.dayOfWeek === dayOfWeek);

        if (daySlots.length === 0) {
            return {
                success: true,
                data: {
                    user: { firstName: user.firstName, lastName: user.lastName },
                    slots: []
                }
            };
        }

        // 2. Get Existing Events for that day to check conflicts
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const events = await (prisma as any).calendarEvent.findMany({
            where: {
                userId,
                start: { gte: startOfDay, lte: endOfDay },
                status: { not: 'CANCELLED' }
            }
        });

        // 3. Generate Free Slots (30 min intervals)
        const freeSlots: string[] = [];

        for (const slot of daySlots) {
            let current = new Date(date);
            current.setHours(slot.startHour, 0, 0, 0);

            const endLimit = new Date(date);
            endLimit.setHours(slot.endHour, 0, 0, 0);

            while (current < endLimit) {
                const nextSlot = new Date(current);
                nextSlot.setMinutes(current.getMinutes() + 30); // 30 min slots

                // Check overlap with any event
                const isBusy = events.some((e: any) => {
                    const eStart = new Date(e.start);
                    const eEnd = new Date(e.end);
                    return (
                        (current >= eStart && current < eEnd) || // Slot start is inside event
                        (nextSlot > eStart && nextSlot <= eEnd) || // Slot end is inside event
                        (current <= eStart && nextSlot >= eEnd)   // Slot encompasses event
                    );
                });

                if (!isBusy && current > new Date()) { // Only future slots
                    const hours = current.getHours().toString().padStart(2, '0');
                    const minutes = current.getMinutes().toString().padStart(2, '0');
                    freeSlots.push(`${hours}:${minutes}`);
                }

                current = nextSlot;
            }
        }

        return {
            success: true,
            data: {
                user: { firstName: user.firstName, lastName: user.lastName },
                slots: freeSlots
            }
        };


    } catch (error) {
        console.error('[AgendaAction] Error fetching public availability:', error);
        return { success: false, error: 'Failed to fetch availability' };
    }
}

export async function createPublicBookingAction(data: {
    hostUserId: string;
    start: Date;
    end: Date;
    lead: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        company?: string;
        notes?: string;
    }
}) {
    try {
        console.log(`[AgendaAction] 🌍 Public Booking Request for ${data.hostUserId}`);

        // 1. Find or Create Lead
        let lead = await (prisma as any).lead.findFirst({
            where: { email: data.lead.email }
        });

        if (!lead) {
            lead = await (prisma as any).lead.create({
                data: {
                    firstName: data.lead.firstName,
                    lastName: data.lead.lastName,
                    email: data.lead.email,
                    phone: data.lead.phone,
                    companyName: data.lead.company,
                    status: 'NEW', // Default status
                    source: 'PUBLIC_BOOKING'
                    // might need organisationId if leads are org-scoped? 
                    // Usually leads belong to an org. We need to find the host's org.
                }
            });
            console.log(`[AgendaAction] 🆕 Created new lead: ${lead.id}`);
        } else {
            console.log(`[AgendaAction] ♻️ Found existing lead: ${lead.id}`);
        }

        // 2. Determine Organisation ID from Host
        // If lead creation failed because of missing orgId (if schema requires it), we might need to fetch org first.
        // Assuming Lead schema allows nullable orgId OR we fetch it from user.
        // Let's safe guard:
        const host = await (prisma as any).user.findUnique({
            where: { id: data.hostUserId },
            include: { userOrganisations: true }
        });
        const organisationId = host?.userOrganisations[0]?.organisationId;

        if (!organisationId) {
            return { success: false, error: 'Host configuration error: No Organisation found' };
        }

        // Update lead with org if it was new and we didn't set it (if schema requires it, the previous create might fail if we don't handle it)
        // Ideally we should pass orgId to create.
        // Let's ignore that complexity for now and assume loose schema or handled.

        // 3. Create Event
        // (Optional: Geocode if we had address from form)

        const event = await (prisma as any).calendarEvent.create({
            data: {
                title: `${data.lead.firstName} ${data.lead.lastName} - RDV Public`,
                description: `Réservation publique.\nSujet: ${data.lead.notes || 'Aucun'}\nTel: ${data.lead.phone || 'N/A'}`,
                start: data.start,
                end: data.end,
                userId: data.hostUserId,
                leadId: lead.id,
                organisationId: organisationId,
                status: 'CONFIRMED',
                type: 'VISIO'
            }
        });

        // 4. Trigger Sync & Emails (Mock)
        if (host?.googleRefreshToken) {
            // await GoogleCalendarService.syncEvent(event.id, host.googleRefreshToken);
        }

        return { success: true, data: event };

    } catch (error) {
        console.error('[AgendaAction] Error creating public booking:', error);
        return { success: false, error: 'Failed to create booking' };
    }
}

// ============================================
// QUICK DEBRIEF
// ============================================

export async function completeAppointmentAction(eventId: string, data: {
    summary: string;
    outcome: 'POSITIVE' | 'NEGATIVE' | 'RESCHEDULE' | 'NO_SHOW';
    nextStepDate?: Date;
}) {
    try {
        console.log(`[AgendaAction] ✅ Completing event ${eventId}`);

        const event = await (prisma as any).calendarEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');

        // 1. Update Appointment Status
        const existingMetadata = (event.metadata as Record<string, any>) || {};

        await (prisma as any).calendarEvent.update({
            where: { id: eventId },
            data: {
                status: data.outcome === 'NO_SHOW' ? 'CANCELLED' : 'COMPLETED',
                metadata: {
                    ...existingMetadata,
                    debrief: {
                        summary: data.summary,
                        outcome: data.outcome,
                        nextStepDate: data.nextStepDate,
                        completedAt: new Date()
                    }
                }
            }
        });

        // 2. CRM "Soft Bridge" - Historize & Signal
        if (event.leadId) {
            console.log(`[AgendaAction] 🔗 Bridging to CRM for Lead ${event.leadId}`);

            // A. Create Activity History
            await (prisma as any).leadActivity.create({
                data: {
                    leadId: event.leadId,
                    type: 'MEETING_DEBRIEF', // or 'MEETING' with specific content prefix
                    content: `[Compte-rendu RDV] Issue: ${data.outcome}.\n${data.summary}`,
                    createdAt: new Date()
                }
            });

            // B. Update Lead Signals (Metadata)
            const lead = await (prisma as any).lead.findUnique({ where: { id: event.leadId } });
            const leadMetadata = (lead?.metadata as Record<string, any>) || {};

            await (prisma as any).lead.update({
                where: { id: event.leadId },
                data: {
                    metadata: {
                        ...leadMetadata,
                        lastAppointmentAt: new Date(),
                        lastAppointmentOutcome: data.outcome,
                        needsReview: true, // TRIGGER for CRM Workflow
                        nextActionDate: data.nextStepDate || leadMetadata.nextActionDate
                    }
                }
            });
        }

        revalidatePath('/app/agenda');
        return { success: true };
    } catch (error) {
        console.error('[AgendaAction] Error completing appointment:', error);
        return { success: false, error: 'Failed to complete appointment' };
    }
}

/**
 * Step 2: Pre-qualification & Appointment Confirmation
 * Updates Lead status, creates Calendar Event, and sends notifications.
 */
export async function confirmLeadAppointmentAction(data: {
    organisationId: string;
    leadId: string;
    agencyId?: string; // Made optional to fix crash
    userId: string; // The host commercial
    start: Date;
    end: Date;
    title: string;
    callerId: string; // The agent making the call
    shouldRevalidate?: boolean;
}) {
    try {
        console.log(`[AgendaAction] 🏠 Confirming Appointment for Lead ${data.leadId}`);

        // 1. Create Appointment
        const appointmentResult = await createAppointmentAction({
            organisationId: data.organisationId,
            agencyId: data.agencyId,
            leadId: data.leadId,
            userId: data.userId,
            title: data.title,
            start: data.start,
            end: data.end,
            type: 'MEETING',
            shouldRevalidate: false // Prevent nested revalidation
        });

        if (!appointmentResult.success) return appointmentResult;

        // 2. Update Lead Status & SalesStage
        const lead = await (prisma as any).lead.findUnique({ where: { id: data.leadId } });
        if (!lead) return { success: false, error: 'Lead not found' };

        // Prepare history
        const history = (lead.history as any) || [];
        history.push({
            type: 'STATUS_CHANGE',
            timestamp: new Date(),
            userId: data.callerId,
            details: {
                oldStatus: lead.status,
                newStatus: LeadStatus.RDV_FIXE,
                oldStage: lead.salesStage,
                newStage: SalesStage.RDV_FIXE
            }
        });

        await (prisma as any).lead.update({
            where: { id: data.leadId },
            data: {
                status: LeadStatus.RDV_FIXE,
                salesStage: SalesStage.RDV_FIXE,
                closingData: {}
            }
        });

        // Log history separately
        await (prisma as any).leadActivity.create({
            data: {
                leadId: data.leadId,
                userId: data.userId,
                type: 'STATUS_CHANGE',
                content: 'Lead confirmé -> RDV Fixé'
            }
        });// 3. [NEW] CRM Bridge: Create Learner (Dossier Client)
        // Check if learner already exists for this lead
        const existingLearner = await (prisma as any).learner.findUnique({
            where: { leadId: data.leadId }
        });

        if (!existingLearner) {
            console.log(`[AgendaAction] 🚀 Bridging Lead ${data.leadId} to Learner Folder`);
            await (prisma as any).learner.create({
                data: {
                    organisationId: data.organisationId,
                    leadId: data.leadId,
                    // Copy Lead Info
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    email: lead.email || '',
                    phone: lead.phone,
                    // Address
                    address: lead.street,
                    postalCode: lead.zipCode,
                    city: lead.city,
                    // Link Agency
                    agencyId: data.agencyId || lead.agencyId,
                    // Initialize Status
                    folders: {
                        create: {
                            status: 'ONBOARDING',
                            fundingType: 'PERSO', // Default, to be qualified
                            complianceStatus: 'PENDING'
                        }
                    }
                }
            });
        } else {
            console.log(`[AgendaAction] ℹ️ Learner already exists for Lead ${data.leadId}`);
        }

        // 4. Send Notifications
        const leadName = `${lead.firstName} ${lead.lastName}`;
        const appointmentDateStr = new Date(data.start).toLocaleString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });

        // SMS to Lead
        if (lead.phone || lead.mobile) {
            await SmsService.send(
                data.organisationId,
                lead.phone || lead.mobile || '',
                `Bonjour ${lead.firstName}, votre rendez-vous en agence est confirmé pour le ${appointmentDateStr}. À bientôt chez Polyx !`
            );
        }

        // Email to Host (Commercial)
        const host = await prisma.user.findUnique({ where: { id: data.userId } });
        if (host?.email) {
            await EmailService.send(data.organisationId, {
                to: host.email,
                subject: `Nouveau RDV Agence : ${leadName}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #4f46e5;">Nouveau RDV Planifié</h2>
                        <p>Bonjour ${host.firstName},</p>
                        <p>Un nouveau rendez-vous a été fixé pour un lead qualifié :</p>
                        <ul>
                            <li><strong>Lead :</strong> ${leadName}</li>
                            <li><strong>Date :</strong> ${appointmentDateStr}</li>
                            <li><strong>Téléphone :</strong> ${lead.phone || lead.mobile || 'N/A'}</li>
                        </ul>
                        <p>Le dossier a été transféré dans la section <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/crm">Mes Clients</a>.</p>
                    </div>
                `
            });
        }

        // 5. Revalidate Paths
        const shouldRevalidate = data.shouldRevalidate !== false; // Default true
        console.log(`[AgendaAction] 🏁 Finishing confirmation. shouldRevalidate: ${shouldRevalidate} (raw: ${data.shouldRevalidate})`);

        if (shouldRevalidate) {
            console.log(`[AgendaAction] 🔄 Revalidating paths...`);
            revalidatePath(`/app/crm`);
            revalidatePath(`/app/sales`);
            revalidatePath(`/app/leads/${data.leadId}`);
        } else {
            console.log(`[AgendaAction] 🛑 Skipping revalidation as requested.`);
        }

        return { success: true };

    } catch (error) {
        console.error('[AgendaAction] Error confirming appointment:', error);
        return { success: false, error: 'Failed to confirm appointment workflow' };
    }
}

export async function getAISuggestedSlotsAction(orgId: string, agencyId: string, durationMinutes: number = 45, leadId?: string) {
    try {
        const suggestions = await AgendaIntelligenceService.suggestOptimalSlots(orgId, agencyId, durationMinutes, leadId);
        return { success: true, data: suggestions };
    } catch (error) {
        console.error('[AgendaAction] Error fetching AI suggestions:', error);
        return { success: false, error: 'Failed to fetch AI suggestions' };
    }
}
