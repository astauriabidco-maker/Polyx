import { WebSocketServer, WebSocket } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { createServer } from 'http';

/**
 * VOICE GATEWAY SERVER
 * This standalone server handles the real-time audio pipeline:
 * Twilio <--> This Server <--> Deepgram
 *                         <--> Browser Client
 */

const PORT = 8080;
const server = createServer();
const wss = new WebSocketServer({ server });

// Map to track active calls and their corresponding browser clients
const activeCalls = new Map<string, {
    twilioWs?: WebSocket;
    clientWs?: WebSocket;
    deepgram?: any;
}>();

wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('[Gateway] New connection');

    let streamSid: string | null = null;
    let callSid: string | null = null;

    ws.on('message', async (message: Buffer) => {
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (e) { return; }

        switch (data.event) {
            case 'start':
                streamSid = data.streamSid;
                callSid = data.start.callSid;
                console.log(`[Gateway] Stream started: ${streamSid} for call ${callSid}`);

                const callState = activeCalls.get(callSid!) || {};

                // Initialize Deepgram
                const dg = await setupDeepgram(callSid!, (transcript, isFinal) => {
                    const current = activeCalls.get(callSid!);
                    if (current?.clientWs) {
                        current.clientWs.send(JSON.stringify({ event: 'transcript', text: transcript, isFinal }));
                    }
                });

                activeCalls.set(callSid!, { ...callState, twilioWs: ws, deepgram: dg });
                break;

            case 'media':
                if (callSid) {
                    const state = activeCalls.get(callSid);
                    if (state?.deepgram && state.deepgram.getReadyState() === 1) {
                        state.deepgram.send(Buffer.from(data.media.payload, 'base64'));
                    }
                }
                break;

            case 'stop':
                console.log(`[Gateway] Stream stopped: ${callSid}`);
                cleanupCall(callSid!);
                break;

            case 'client_init':
                const browserCallSid = data.callSid;
                console.log(`[Gateway] Browser connected for ${browserCallSid}`);
                const existing = activeCalls.get(browserCallSid) || {};
                activeCalls.set(browserCallSid, { ...existing, clientWs: ws });
                break;
        }
    });

    ws.on('close', () => {
        if (callSid) cleanupCall(callSid);
    });
});

async function setupDeepgram(callSid: string, onTranscript: (t: string, f: boolean) => void) {
    if (!process.env.DEEPGRAM_API_KEY) {
        console.warn('[Gateway] No DEEPGRAM_API_KEY, using mock transcription');
        return null;
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!).listen.live({
        model: 'nova-2', language: 'fr-FR', smart_format: true,
        interim_results: true, encoding: 'mulaw', sample_rate: 8000,
    });

    deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) onTranscript(transcript, data.is_final);
    });

    return deepgram;
}

function broadcastToClient(transcript: string, isFinal: boolean) {
    // Basic broadcast to all clients for now
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                event: 'transcript',
                text: transcript,
                isFinal
            }));
        }
    });
}

function cleanupCall(callSid: string) {
    const call = activeCalls.get(callSid);
    if (call) {
        if (call.deepgram) call.deepgram.finish();
        activeCalls.delete(callSid);
    }
}

server.listen(PORT, () => {
    console.log(`[Gateway] Voice Gateway listening on port ${PORT}`);
});
