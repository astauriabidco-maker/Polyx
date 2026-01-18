import { prisma } from '@/lib/prisma';
import { GoogleCalendarService } from '@/application/services/google-calendar.service';
import { decrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

/**
 * Triggered by Webhook or manual sync.
 * Processes changes from Google Calendar since the last syncToken.
 */
export async function processIncrementalSyncAction(targetId: string, type: 'ORG' | 'USER') {
    try {
        console.log(`[GoogleSync] 🔄 Starting incremental sync for ${type}: ${targetId}`);

        let refreshToken: string | null = null;
        let organisationId: string | null = null;
        let currentSyncToken: string | null = null;
        let calendarId: string = 'primary';

        // 1. Fetch credentials and current state
        if (type === 'ORG') {
            const config = await (prisma as any).integrationConfig.findUnique({
                where: { organisationId: targetId }
            });
            if (config?.googleRefreshToken) {
                refreshToken = decrypt(config.googleRefreshToken);
                organisationId = targetId;
                currentSyncToken = config.googleSyncToken;
                calendarId = config.googleCalendarId || 'primary';
            }
        } else {
            const user = await prisma.user.findUnique({
                where: { id: targetId },
                include: { accessGrants: true }
            });
            if (user?.googleRefreshToken) {
                refreshToken = decrypt(user.googleRefreshToken);
                organisationId = user.accessGrants[0]?.organisationId || null;
                currentSyncToken = (user as any).googleSyncToken;
            }
        }

        if (!refreshToken || !organisationId) {
            console.error(`[GoogleSync] No refresh token or org found for ${type}: ${targetId}`);
            return { success: false, error: 'Configuration introuvable' };
        }

        // 2. Refresh Access Token
        const { accessToken } = await GoogleCalendarService.refreshAccessToken(refreshToken);

        // 3. Fetch changed events
        let result;
        try {
            result = await GoogleCalendarService.getEvents(accessToken, calendarId, {
                syncToken: currentSyncToken || undefined
            });
        } catch (err: any) {
            if (err.message === 'FULL_SYNC_REQUIRED') {
                console.warn('[GoogleSync] Full sync required, syncToken was invalid.');
                result = await GoogleCalendarService.getEvents(accessToken, calendarId);
            } else {
                throw err;
            }
        }

        const { items, nextSyncToken } = result;
        console.log(`[GoogleSync] 📥 Received ${items.length} changes from Google`);

        // 4. Process changes
        for (const item of items) {
            const googleEventId = item.id;
            if (!googleEventId) continue;

            if (item.status === 'cancelled') {
                // Delete local event if it exists
                await (prisma as any).calendarEvent.deleteMany({
                    where: { googleEventId, organisationId }
                });
                console.log(`[GoogleSync] 🗑️ Deleted event: ${googleEventId}`);
            } else {
                // Upsert local event
                const start = new Date(item.start?.dateTime || item.start?.date || '');
                const end = new Date(item.end?.dateTime || item.end?.date || '');

                // Find existing by googleEventId OR potentially by title/start if it was created locally but not yet synced (rare)
                const existing = await (prisma as any).calendarEvent.findFirst({
                    where: { googleEventId, organisationId }
                });

                if (existing) {
                    await (prisma as any).calendarEvent.update({
                        where: { id: existing.id },
                        data: {
                            title: item.summary,
                            description: item.description,
                            start,
                            end,
                            // metadata can be preserved or merged
                        }
                    });
                    console.log(`[GoogleSync] ✏️ Updated event: ${googleEventId}`);
                } else {
                    // It's a new event from Google
                    // Note: We might want to link it to a user if targetId is a USER
                    await (prisma as any).calendarEvent.create({
                        data: {
                            organisationId: organisationId!,
                            userId: type === 'USER' ? targetId : (await getDefaultUserId(organisationId!)),
                            title: item.summary,
                            description: item.description,
                            start,
                            end,
                            status: 'SCHEDULED',
                            googleEventId
                        }
                    });
                    console.log(`[GoogleSync] ✨ Created new event: ${googleEventId}`);
                }
            }
        }

        // 5. Update syncToken
        if (nextSyncToken) {
            if (type === 'ORG') {
                await (prisma as any).integrationConfig.update({
                    where: { organisationId: targetId },
                    data: { googleSyncToken: nextSyncToken, googleLastSyncAt: new Date() }
                });
            } else {
                await prisma.user.update({
                    where: { id: targetId },
                    data: { googleSyncToken: nextSyncToken } as any
                });
            }
        }

        revalidatePath('/app/agenda');
        return { success: true, count: items.length };

    } catch (error: any) {
        console.error('[GoogleSync] Error during incremental sync:', error);
        return { success: false, error: error.message };
    }
}

async function getDefaultUserId(orgId: string): Promise<string> {
    const admin = await prisma.user.findFirst({
        where: { accessGrants: { some: { organisationId: orgId } } }
    });
    return admin?.id || '';
}

/**
 * Enables or disables Google Calendar Watch for an Org or User.
 */
export async function toggleGoogleWatchAction(targetId: string, type: 'ORG' | 'USER', enabled: boolean) {
    try {
        console.log(`[GoogleSync] 🔔 Toggling Watch for ${type}: ${targetId} -> ${enabled}`);

        let refreshToken: string | null = null;
        let organisationId: string | null = null;
        let calendarId: string = 'primary';
        let existingChannelId: string | null = null;
        let existingResourceId: string | null = null;

        if (type === 'ORG') {
            const config = await (prisma as any).integrationConfig.findUnique({
                where: { organisationId: targetId }
            });
            if (config?.googleRefreshToken) {
                refreshToken = decrypt(config.googleRefreshToken);
                organisationId = targetId;
                calendarId = config.googleCalendarId || 'primary';
                existingChannelId = config.googleChannelId;
                existingResourceId = config.googleResourceId;
            }
        } else {
            const user = await prisma.user.findUnique({
                where: { id: targetId },
                include: { accessGrants: true }
            });
            if (user?.googleRefreshToken) {
                refreshToken = decrypt(user.googleRefreshToken);
                organisationId = user.accessGrants[0]?.organisationId || null;
                existingChannelId = (user as any).googleChannelId;
                existingResourceId = (user as any).googleResourceId;
            }
        }

        if (!refreshToken) throw new Error('Google Integration non configurée');

        const { accessToken } = await GoogleCalendarService.refreshAccessToken(refreshToken);

        if (enabled) {
            // 1. Start Watch
            const channelId = crypto.randomUUID();
            const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`;

            console.log(`[GoogleSync] Subscribing with webhook: ${webhookUrl}`);
            const watchData = await GoogleCalendarService.watchCalendar(
                accessToken,
                calendarId,
                channelId,
                webhookUrl
            );

            // 2. Save to DB
            const expiration = new Date(Number(watchData.expiration));
            if (type === 'ORG') {
                await (prisma as any).integrationConfig.update({
                    where: { organisationId: targetId },
                    data: {
                        googleChannelId: channelId,
                        googleResourceId: watchData.resourceId,
                        googleChannelExpiration: expiration
                    }
                });
            } else {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        googleChannelId: channelId,
                        googleResourceId: watchData.resourceId,
                        googleChannelExpiration: expiration
                    } as any
                });
            }

            // 3. Initial Sync
            await processIncrementalSyncAction(targetId, type);

        } else {
            // 1. Stop Watch
            if (existingChannelId && existingResourceId) {
                await GoogleCalendarService.stopWatch(accessToken, existingChannelId, existingResourceId);
            }

            // 2. Clear from DB
            if (type === 'ORG') {
                await (prisma as any).integrationConfig.update({
                    where: { organisationId: targetId },
                    data: {
                        googleChannelId: null,
                        googleResourceId: null,
                        googleChannelExpiration: null
                    }
                });
            } else {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        googleChannelId: null,
                        googleResourceId: null,
                        googleChannelExpiration: null
                    } as any
                });
            }
        }

        return { success: true };

    } catch (error: any) {
        console.error('[GoogleSync] Error toggling Watch:', error);
        return { success: false, error: error.message };
    }
}
