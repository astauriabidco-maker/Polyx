/**
 * Google Calendar Integration Service
 * Handles OAuth 2.0 flow and Calendar API operations
 * 
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { encrypt, decrypt } from '@/lib/crypto';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Scopes required for calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

export interface GoogleTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    email?: string;
}

export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    attendees?: { email: string; displayName?: string }[];
    colorId?: string;
    status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarListItem {
    id: string;
    summary: string;
    primary?: boolean;
    accessRole: string;
}

export class GoogleCalendarService {

    /**
     * Generate the OAuth authorization URL
     */
    static getAuthUrl(state: string, redirectUri: string): string {
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            throw new Error('GOOGLE_CLIENT_ID non configuré');
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: SCOPES,
            access_type: 'offline',
            prompt: 'consent',
            state: state // Pass state to identify the context on callback
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Google OAuth credentials not configured');
        }

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
        }

        // Get user email
        const email = await this.getUserEmail(data.access_token);

        const expiresAt = new Date(Date.now() + data.expires_in * 1000);

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
            email
        };
    }

    /**
     * Refresh an expired access token
     */
    static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Google OAuth credentials not configured');
        }

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Token refresh error: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        };
    }

    /**
     * Get user email from token
     */
    private static async getUserEmail(accessToken: string): Promise<string | undefined> {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json();
            return data.email;
        } catch {
            return undefined;
        }
    }

    /**
     * List all calendars for the user
     */
    static async listCalendars(accessToken: string): Promise<CalendarListItem[]> {
        const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Calendar list error: ${data.error.message}`);
        }

        return data.items?.map((item: any) => ({
            id: item.id,
            summary: item.summary,
            primary: item.primary || false,
            accessRole: item.accessRole
        })) || [];
    }

    /**
     * Get events from a calendar (supports incremental sync via syncToken)
     */
    static async getEvents(
        accessToken: string,
        calendarId: string = 'primary',
        options: { maxResults?: number; timeMin?: Date; timeMax?: Date; syncToken?: string } = {}
    ): Promise<{ items: CalendarEvent[]; nextSyncToken?: string }> {
        const params = new URLSearchParams({
            maxResults: String(options.maxResults || 250),
            singleEvents: options.syncToken ? 'false' : 'true', // Incremental sync requires singleEvents=false
        });

        if (options.syncToken) {
            params.append('syncToken', options.syncToken);
        } else {
            params.append('orderBy', 'startTime');
            params.append('timeMin', (options.timeMin || new Date()).toISOString());
            if (options.timeMax) {
                params.append('timeMax', options.timeMax.toISOString());
            }
        }

        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const data = await response.json();

        if (data.error) {
            // If syncToken is invalid, we might need to do a full sync
            if (data.error.errors?.[0]?.reason === 'fullSyncRequired') {
                throw new Error('FULL_SYNC_REQUIRED');
            }
            throw new Error(`Get events error: ${data.error.message}`);
        }

        const items = data.items?.map((item: any) => ({
            id: item.id,
            summary: item.summary || '(Sans titre)',
            description: item.description,
            location: item.location,
            start: item.start,
            end: item.end,
            attendees: item.attendees,
            status: item.status // 'confirmed', 'tentative', 'cancelled'
        })) || [];

        return { items, nextSyncToken: data.nextSyncToken };
    }

    /**
     * Subscribe to a calendar's push notifications (Webhooks)
     */
    static async watchCalendar(
        accessToken: string,
        calendarId: string,
        channelId: string,
        webhookUrl: string
    ): Promise<{ resourceId: string; expiration: string }> {
        const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/watch`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                // token: 'optional-verification-token'
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Watch error: ${data.error.message}`);
        }

        return {
            resourceId: data.resourceId,
            expiration: data.expiration
        };
    }

    /**
     * Stop a push notification subscription
     */
    static async stopWatch(accessToken: string, channelId: string, resourceId: string): Promise<void> {
        const response = await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: channelId,
                resourceId: resourceId
            })
        });

        if (!response.ok && response.status !== 204) {
            const data = await response.json().catch(() => ({}));
            console.warn('[GoogleCalendar] Failed to stop watch:', data.error?.message || response.statusText);
        }
    }

    /**
     * Create a new event in the calendar
     */
    static async createEvent(
        accessToken: string,
        calendarId: string = 'primary',
        event: CalendarEvent
    ): Promise<CalendarEvent> {
        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: event.summary,
                    description: event.description,
                    location: event.location,
                    start: event.start,
                    end: event.end,
                    attendees: event.attendees,
                    colorId: event.colorId
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(`Create event error: ${data.error.message}`);
        }

        return {
            id: data.id,
            summary: data.summary,
            description: data.description,
            location: data.location,
            start: data.start,
            end: data.end,
            attendees: data.attendees
        };
    }

    /**
     * Update an existing event
     */
    static async updateEvent(
        accessToken: string,
        calendarId: string,
        eventId: string,
        updates: Partial<CalendarEvent>
    ): Promise<CalendarEvent> {
        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(`Update event error: ${data.error.message}`);
        }

        return data;
    }

    /**
     * Delete an event
     */
    static async deleteEvent(
        accessToken: string,
        calendarId: string,
        eventId: string
    ): Promise<void> {
        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        if (!response.ok && response.status !== 204) {
            const data = await response.json();
            throw new Error(`Delete event error: ${data.error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Sync a local event to Google Calendar
     */
    static async syncEvent(eventId: string, refreshToken: string): Promise<boolean> {
        try {
            const { prisma } = await import('@/lib/prisma');
            const event = await (prisma as any).calendarEvent.findUnique({
                where: { id: eventId }
            });

            if (!event) return false;

            const { accessToken } = await this.refreshAccessToken(refreshToken);

            const eventData: CalendarEvent = {
                summary: event.title,
                description: event.description || '',
                start: { dateTime: event.start.toISOString() },
                end: { dateTime: event.end.toISOString() }
            };

            if (event.googleEventId) {
                // Update existing event
                try {
                    await this.updateEvent(accessToken, 'primary', event.googleEventId, eventData);
                } catch (err) {
                    console.warn('[GoogleCalendarService] Failed to update event, trying create instead:', err);
                    // If update fails (e.g. event deleted on Google), try creating a new one
                    const created = await this.createEvent(accessToken, 'primary', eventData);
                    await (prisma as any).calendarEvent.update({
                        where: { id: eventId },
                        data: { googleEventId: created.id }
                    });
                }
            } else {
                // Create new event
                const created = await this.createEvent(accessToken, 'primary', eventData);
                await (prisma as any).calendarEvent.update({
                    where: { id: eventId },
                    data: { googleEventId: created.id }
                });
            }

            return true;
        } catch (error) {
            console.error('[GoogleCalendarService] Sync error:', error);
            return false;
        }
    }

    /**
     * Check if tokens are configured
     */
    static isConfigured(): boolean {
        return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    }
}
