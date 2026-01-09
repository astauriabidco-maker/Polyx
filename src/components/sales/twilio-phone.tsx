'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CallStatus = 'IDLE' | 'CONNECTING' | 'RINGING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface TwilioPhoneHandle {
    makeCall: (to: string, callerId?: string) => void;
    hangUp: () => void;
}

interface TwilioPhoneProps {
    orgId: string;
    onStatusChange?: (status: CallStatus) => void;
    onDurationUpdate?: (seconds: number) => void;
    onCallEnd?: (duration: number) => void;
    onError?: (error: string) => void;
}

export const TwilioPhone = forwardRef<TwilioPhoneHandle, TwilioPhoneProps>(function TwilioPhone({
    orgId,
    onStatusChange,
    onDurationUpdate,
    onCallEnd,
    onError
}, ref) {
    const deviceRef = useRef<Device | null>(null);
    const callRef = useRef<Call | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [status, setStatus] = useState<CallStatus>('IDLE');
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    // Update parent on status change
    useEffect(() => {
        onStatusChange?.(status);
    }, [status, onStatusChange]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        makeCall: (to: string, callerId?: string) => makeCallInternal(to, callerId),
        hangUp: () => hangUpInternal()
    }), []);

    // Initialize Twilio Device
    useEffect(() => {
        async function initDevice() {
            try {
                // Fetch token from our API
                const res = await fetch('/api/twilio/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgId })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Erreur de récupération du token');
                }

                const { token } = await res.json();

                // Create and register Device
                const device = new Device(token, {
                    logLevel: 1,
                    codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU]
                });

                device.on('registered', () => {
                    console.log('[TwilioPhone] Device registered');
                    setIsInitialized(true);
                });

                device.on('error', (error) => {
                    console.error('[TwilioPhone] Device error:', error);
                    setInitError(error.message);
                    onError?.(error.message);
                });

                device.on('tokenWillExpire', async () => {
                    console.log('[TwilioPhone] Token expiring, refreshing...');
                    const res = await fetch('/api/twilio/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orgId })
                    });
                    if (res.ok) {
                        const { token } = await res.json();
                        device.updateToken(token);
                    }
                });

                await device.register();
                deviceRef.current = device;

            } catch (error: any) {
                console.error('[TwilioPhone] Init error:', error);
                setInitError(error.message);
                onError?.(error.message);
            }
        }

        initDevice();

        return () => {
            if (deviceRef.current) {
                deviceRef.current.destroy();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [orgId, onError]);

    // Start call timer
    const startTimer = useCallback(() => {
        setDuration(0);
        timerRef.current = setInterval(() => {
            setDuration(prev => {
                const newDuration = prev + 1;
                onDurationUpdate?.(newDuration);
                return newDuration;
            });
        }, 1000);
    }, [onDurationUpdate]);

    // Stop call timer
    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Make a call (internal)
    const makeCallInternal = useCallback(async (to: string, callerId?: string) => {
        if (!deviceRef.current || !isInitialized) {
            onError?.('Téléphone non initialisé');
            return;
        }

        try {
            setStatus('CONNECTING');

            const params: Record<string, string> = { To: to };
            if (callerId) params.CallerId = callerId;

            const call = await deviceRef.current.connect({ params });
            callRef.current = call;

            call.on('ringing', () => {
                console.log('[TwilioPhone] Ringing...');
                setStatus('RINGING');
            });

            call.on('accept', () => {
                console.log('[TwilioPhone] Call accepted');
                setStatus('CONNECTED');
                startTimer();
            });

            call.on('disconnect', () => {
                console.log('[TwilioPhone] Call disconnected');
                setStatus('DISCONNECTED');
                stopTimer();
                onCallEnd?.(duration);
                callRef.current = null;
            });

            call.on('cancel', () => {
                console.log('[TwilioPhone] Call cancelled');
                setStatus('IDLE');
                stopTimer();
                callRef.current = null;
            });

            call.on('error', (error) => {
                console.error('[TwilioPhone] Call error:', error);
                setStatus('ERROR');
                stopTimer();
                onError?.(error.message);
                callRef.current = null;
            });

        } catch (error: any) {
            console.error('[TwilioPhone] Connect error:', error);
            setStatus('ERROR');
            onError?.(error.message);
        }
    }, [isInitialized, startTimer, stopTimer, duration, onCallEnd, onError]);

    // Hang up (internal)
    const hangUpInternal = useCallback(() => {
        if (callRef.current) {
            callRef.current.disconnect();
        }
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (callRef.current) {
            if (isMuted) {
                callRef.current.mute(false);
            } else {
                callRef.current.mute(true);
            }
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    // Format duration
    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Render based on state
    if (initError) {
        return (
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-600 text-sm font-medium">Erreur d'initialisation</p>
                <p className="text-red-500 text-xs mt-1">{initError}</p>
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center gap-2 p-4 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">Initialisation du téléphone...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Status & Duration */}
            {status !== 'IDLE' && (
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {status === 'CONNECTING' && 'Connexion...'}
                        {status === 'RINGING' && 'Ça sonne...'}
                        {status === 'CONNECTED' && 'En ligne'}
                        {status === 'DISCONNECTED' && 'Terminé'}
                        {status === 'ERROR' && 'Erreur'}
                    </p>
                    {(status === 'CONNECTED' || status === 'DISCONNECTED') && (
                        <p className="text-3xl font-black text-slate-900 tabular-nums">
                            {formatDuration(duration)}
                        </p>
                    )}
                </div>
            )}

            {/* Call Controls */}
            <div className="flex items-center gap-3">
                {status === 'IDLE' && (
                    <Button
                        onClick={() => makeCallInternal('placeholder')} // Will be overridden by parent
                        disabled
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Phone size={18} className="mr-2" />
                        Prêt à appeler
                    </Button>
                )}

                {(status === 'CONNECTING' || status === 'RINGING' || status === 'CONNECTED') && (
                    <>
                        <Button
                            variant="outline"
                            onClick={toggleMute}
                            className={isMuted ? 'bg-amber-100 border-amber-300 text-amber-700' : ''}
                        >
                            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </Button>

                        <Button
                            onClick={hangUpInternal}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <PhoneOff size={18} className="mr-2" />
                            Raccrocher
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
});

// Export hook for external control
export function useTwilioPhone() {
    const phoneRef = useRef<{ makeCall: (to: string, callerId?: string) => void; hangUp: () => void } | null>(null);

    return {
        makeCall: (to: string, callerId?: string) => phoneRef.current?.makeCall(to, callerId),
        hangUp: () => phoneRef.current?.hangUp(),
        ref: phoneRef
    };
}
