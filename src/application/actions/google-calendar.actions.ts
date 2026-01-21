'use server';

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { GoogleCalendarService, CalendarEvent } from '@/application/services/google-calendar.service';
import { revalidatePath } from 'next/cache';

// ============================================
// GET GOOGLE CALENDAR STATUS
// ============================================

export async function getGoogleCalendarStatusAction(orgId: string) {
    try {
        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config) {
            return {
                success: true,
                data: {
                    enabled: false,
                    configured: GoogleCalendarService.isConfigured()
                }
            };
        }

        return {
            success: true,
            data: {
                enabled: config.googleCalendarEnabled,
                connectedEmail: config.googleConnectedEmail,
                calendarId: config.googleCalendarId,
                lastSyncAt: config.googleLastSyncAt,
                syncStatus: config.googleSyncStatus,
                configured: GoogleCalendarService.isConfigured()
            }
        };
    } catch (error) {
        console.error('[GoogleCalendarAction] Error getting status:', error);
        return { success: false, error: 'Erreur lors de la récupération du statut.' };
    }
}

// ============================================
// INITIATE GOOGLE OAUTH
// ============================================

export async function initiateGoogleOAuthAction(orgId: string, baseUrl: string) {
    try {
        if (!GoogleCalendarService.isConfigured()) {
            return { success: false, error: 'Google OAuth non configuré. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.' };
        }

        const redirectUri = `${baseUrl}/api/auth/google/callback`;
        const authUrl = GoogleCalendarService.getAuthUrl(orgId, redirectUri);

        return { success: true, authUrl };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error initiating OAuth:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DISCONNECT GOOGLE CALENDAR
// ============================================

export async function disconnectGoogleCalendarAction(orgId: string) {
    try {
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                googleCalendarEnabled: false,
                googleAccessToken: null,
                googleRefreshToken: null,
                googleTokenExpiry: null,
                googleCalendarId: null,
                googleConnectedEmail: null,
                googleSyncStatus: null
            }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, message: 'Google Calendar déconnecté.' };
    } catch (error) {
        console.error('[GoogleCalendarAction] Error disconnecting:', error);
        return { success: false, error: 'Erreur lors de la déconnexion.' };
    }
}

// ============================================
// GET VALID ACCESS TOKEN (with auto-refresh)
// ============================================

async function getValidAccessToken(orgId: string): Promise<string | null> {
    const config = await (prisma as any).integrationConfig.findUnique({
        where: { organisationId: orgId }
    });

    if (!config || !config.googleAccessToken || !config.googleRefreshToken) {
        return null;
    }

    const accessToken = decrypt(config.googleAccessToken);
    const refreshToken = decrypt(config.googleRefreshToken);
    const expiry = config.googleTokenExpiry;

    // Check if token is expired or will expire in 5 minutes
    const isExpired = !expiry || new Date(expiry).getTime() < Date.now() + 5 * 60 * 1000;

    if (isExpired) {
        try {
            const newTokens = await GoogleCalendarService.refreshAccessToken(refreshToken);

            // Update database with new token
            await (prisma as any).integrationConfig.update({
                where: { organisationId: orgId },
                data: {
                    googleAccessToken: encrypt(newTokens.accessToken),
                    googleTokenExpiry: newTokens.expiresAt
                }
            });

            return newTokens.accessToken;
        } catch (error) {
            console.error('[GoogleCalendarAction] Token refresh failed:', error);
            return null;
        }
    }

    return accessToken;
}

// ============================================
// LIST CALENDARS
// ============================================

export async function listGoogleCalendarsAction(orgId: string) {
    try {
        const accessToken = await getValidAccessToken(orgId);
        if (!accessToken) {
            return { success: false, error: 'Token invalide. Reconnectez Google Calendar.' };
        }

        const calendars = await GoogleCalendarService.listCalendars(accessToken);
        return { success: true, calendars };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error listing calendars:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SELECT CALENDAR
// ============================================

export async function selectGoogleCalendarAction(orgId: string, calendarId: string) {
    try {
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: { googleCalendarId: calendarId }
        });

        revalidatePath('/app/settings/integrations');
        return { success: true, message: 'Calendrier sélectionné.' };
    } catch (error) {
        return { success: false, error: 'Erreur lors de la sélection.' };
    }
}

// ============================================
// GET UPCOMING EVENTS
// ============================================

export async function getGoogleEventsAction(
    orgId: string,
    options?: { maxResults?: number; daysAhead?: number }
) {
    try {
        const accessToken = await getValidAccessToken(orgId);
        if (!accessToken) {
            return { success: false, error: 'Token invalide.' };
        }

        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        const calendarId = config?.googleCalendarId || 'primary';

        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + (options?.daysAhead || 30));

        const events = await GoogleCalendarService.getEvents(accessToken, calendarId, {
            maxResults: options?.maxResults || 50,
            timeMin,
            timeMax
        });

        // Update sync status
        await (prisma as any).integrationConfig.update({
            where: { organisationId: orgId },
            data: {
                googleLastSyncAt: new Date(),
                googleSyncStatus: 'success'
            }
        });

        return { success: true, events };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error fetching events:', error);

        // Update sync status to failed
        try {
            await (prisma as any).integrationConfig.update({
                where: { organisationId: orgId },
                data: { googleSyncStatus: 'failed' }
            });
        } catch { }

        return { success: false, error: error.message };
    }
}

// ============================================
// CREATE EVENT
// ============================================

export async function createGoogleEventAction(orgId: string, event: CalendarEvent) {
    try {
        const accessToken = await getValidAccessToken(orgId);
        if (!accessToken) {
            return { success: false, error: 'Token invalide.' };
        }

        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        const calendarId = config?.googleCalendarId || 'primary';

        const createdEvent = await GoogleCalendarService.createEvent(accessToken, calendarId, event);
        return { success: true, event: createdEvent };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error creating event:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DELETE EVENT
// ============================================

export async function deleteGoogleEventAction(orgId: string, eventId: string) {
    try {
        const accessToken = await getValidAccessToken(orgId);
        if (!accessToken) {
            return { success: false, error: 'Token invalide.' };
        }

        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        const calendarId = config?.googleCalendarId || 'primary';

        await GoogleCalendarService.deleteEvent(accessToken, calendarId, eventId);
        return { success: true, message: 'Événement supprimé.' };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error deleting event:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SYNC APPOINTMENT TO GOOGLE
// ============================================

export async function syncAppointmentToGoogleAction(
    orgId: string,
    appointment: {
        title: string;
        description?: string;
        startTime: Date;
        endTime: Date;
        attendeeEmail?: string;
        attendeeName?: string;
        location?: string;
    }
) {
    try {
        const accessToken = await getValidAccessToken(orgId);
        if (!accessToken) {
            return { success: false, error: 'Google Calendar non connecté.' };
        }

        const config = await (prisma as any).integrationConfig.findUnique({
            where: { organisationId: orgId }
        });

        if (!config?.googleCalendarEnabled) {
            return { success: false, error: 'Google Calendar désactivé.' };
        }

        const calendarId = config.googleCalendarId || 'primary';

        const event: CalendarEvent = {
            summary: appointment.title,
            description: appointment.description,
            location: appointment.location,
            start: {
                dateTime: appointment.startTime.toISOString(),
                timeZone: 'Europe/Paris'
            },
            end: {
                dateTime: appointment.endTime.toISOString(),
                timeZone: 'Europe/Paris'
            },
            attendees: appointment.attendeeEmail ? [
                {
                    email: appointment.attendeeEmail,
                    displayName: appointment.attendeeName
                }
            ] : undefined
        };

        const createdEvent = await GoogleCalendarService.createEvent(accessToken, calendarId, event);

        return { success: true, googleEventId: createdEvent.id };
    } catch (error: any) {
        console.error('[GoogleCalendarAction] Error syncing appointment:', error);
        return { success: false, error: error.message };
    }
}
