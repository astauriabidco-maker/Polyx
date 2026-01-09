'use server';

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

/**
 * Generates a Twilio Access Token for browser-based calling.
 * POST /api/twilio/token
 * Body: { orgId: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Auth check using cookies
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token || !token.startsWith('mock_token_')) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const userId = token.replace('mock_token_', '');

        const { orgId } = await request.json();

        if (!orgId) {
            return NextResponse.json({ error: 'Organisation ID requis' }, { status: 400 });
        }

        // Fetch Twilio config from database
        const config = await prisma.integrationConfig.findUnique({
            where: { organisationId: orgId }
        }) as any;

        if (!config?.twilioAccountSid || !config?.twilioApiKey || !config?.twilioApiSecret) {
            return NextResponse.json({
                error: 'Configuration Twilio Voice incomplète. Veuillez configurer API Key et API Secret.'
            }, { status: 400 });
        }

        const accountSid = config.twilioAccountSid;
        const apiKey = decrypt(config.twilioApiKey);
        const apiSecret = decrypt(config.twilioApiSecret);
        const twimlAppSid = config.twilioTwimlAppSid ? decrypt(config.twilioTwimlAppSid) : null;

        if (!twimlAppSid) {
            return NextResponse.json({
                error: 'TwiML Application SID non configuré. Créez une TwiML App dans Twilio Console.'
            }, { status: 400 });
        }

        // Create an access token
        const identity = `user_${userId}`;

        const accessToken = new AccessToken(
            accountSid,
            apiKey,
            apiSecret,
            { identity, ttl: 3600 } // 1 hour TTL
        );

        // Create a Voice grant
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: false // Disable incoming calls for now
        });

        accessToken.addGrant(voiceGrant);

        return NextResponse.json({
            token: accessToken.toJwt(),
            identity
        });

    } catch (error: any) {
        console.error('[Twilio Token] Error:', error);
        return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
    }
}
