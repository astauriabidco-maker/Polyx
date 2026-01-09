'use server';

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * TwiML Webhook for handling outbound voice calls.
 * Called by Twilio when a call is initiated from the browser.
 * POST /api/twilio/voice
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const to = formData.get('To') as string;
        const from = formData.get('CallerId') as string || formData.get('From') as string;

        console.log(`[Twilio Voice] Initiating call from ${from} to ${to}`);

        const twiml = new VoiceResponse();

        if (!to) {
            twiml.say({ language: 'fr-FR' }, 'Erreur: Aucun numéro de destination.');
        } else {
            const streamUrl = process.env.VOICE_GATEWAY_URL || 'ws://localhost:8080';

            const dial = twiml.dial({
                callerId: from,
                record: 'record-from-answer-dual',
                recordingStatusCallback: '/api/twilio/recording-status'
            });

            // Start audio stream to our gateway
            dial.stream({ url: streamUrl });

            if (to.startsWith('whatsapp:')) {
                // WhatsApp Voice Call
                // @ts-ignore - whatsapp is a newer noun in twilio-node
                dial.whatsapp(to.replace('whatsapp:', ''));
            } else if (to.startsWith('client:')) {
                dial.client(to.replace('client:', ''));
            } else {
                // Standard Number
                dial.number(to);
            }
        }

        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'application/xml' }
        });

    } catch (error: any) {
        console.error('[Twilio Voice] Webhook Error:', error);
        const twiml = new VoiceResponse();
        twiml.say({ language: 'fr-FR' }, 'Une erreur technique est survenue.');
        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'application/xml' }
        });
    }
}

export async function GET() {
    return new NextResponse('Twilio Voice Webhook Active', { status: 200 });
}
