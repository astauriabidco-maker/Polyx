import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processIncrementalSyncAction } from '@/application/actions/google-sync.actions';

/**
 * Handle Google Calendar Webhook Notifications
 * POST /api/webhooks/google-calendar
 */
export async function POST(req: NextRequest) {
    try {
        const channelId = req.headers.get('x-goog-channel-id');
        const resourceId = req.headers.get('x-goog-resource-id');
        const resourceState = req.headers.get('x-goog-resource-state'); // 'sync' | 'exists'

        console.log(`[GoogleWebhook] 📢 Received notification. Channel: ${channelId}, State: ${resourceState}`);

        if (resourceState === 'sync') {
            return new NextResponse('Sync OK', { status: 200 });
        }

        if (!channelId) {
            return new NextResponse('Missing channel ID', { status: 400 });
        }

        // 1. Find the target based on channelId
        // The channelId is stored in 'googleChannelId' in the DB

        // Search in IntegrationConfigs (Org)
        const orgConfig = await (prisma as any).integrationConfig.findFirst({
            where: { googleChannelId: channelId, googleResourceId: resourceId }
        });

        if (orgConfig) {
            console.log(`[GoogleWebhook] 🏢 Found matching Organisation: ${orgConfig.organisationId}`);
            await processIncrementalSyncAction(orgConfig.organisationId, 'ORG');
            return new NextResponse('OK', { status: 200 });
        }

        // Search in Users
        const user = await prisma.user.findFirst({
            where: { googleChannelId: channelId, googleResourceId: resourceId } as any
        });

        if (user) {
            console.log(`[GoogleWebhook] 👤 Found matching User: ${user.id}`);
            await processIncrementalSyncAction(user.id, 'USER');
            return new NextResponse('OK', { status: 200 });
        }

        console.warn(`[GoogleWebhook] ❓ No matching channel/resource found for ID: ${channelId}`);
        return new NextResponse('Channel not found', { status: 200 }); // Google expects 2xx even if we don't know the channel

    } catch (error) {
        console.error('[GoogleWebhook] Error processing notification:', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
