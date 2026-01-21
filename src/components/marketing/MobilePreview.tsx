'use client';

import { Battery, Signal, Wifi } from 'lucide-react';

interface LocalStep {
    id?: string;
    order: number;
    type: string; // SMS, EMAIL, WHATSAPP
    channel: string;
    delayInHours: number;
    subject?: string;
    content: string;
}

interface MobilePreviewProps {
    steps: LocalStep[];
    previewType?: 'IOS' | 'ANDROID';
}

export function MobilePreview({ steps, previewType = 'IOS' }: MobilePreviewProps) {
    const isWhatsApp = steps.some(s => s.channel === 'WHATSAPP');
    const appColor = isWhatsApp ? 'bg-[#008069]' : 'bg-slate-100';
    const headerTitle = isWhatsApp ? 'Polyx Assistant' : 'Mary de Polyx';

    return (
        <div className="mx-auto w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden relative select-none ring-1 ring-slate-900/10">
            {/* Notch / Dynamic Island */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-black rounded-b-xl z-20"></div>

            {/* Status Bar */}
            <div className={`absolute top-0 inset-x-0 h-12 z-10 flex justify-between items-center px-6 text-xs font-medium ${isWhatsApp ? 'text-white' : 'text-slate-900'}`}>
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                    <Signal size={12} />
                    <Wifi size={12} />
                    <Battery size={14} />
                </div>
            </div>

            {/* App Header */}
            <div className={`pt-12 pb-3 px-4 shadow-sm z-0 relative ${isWhatsApp ? 'bg-[#008069] text-white' : 'bg-slate-50/80 backdrop-blur-md border-b'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-white/20">
                        CX
                    </div>
                    <div>
                        <div className={`text-sm font-bold leading-tight ${!isWhatsApp && 'text-slate-900'}`}>{headerTitle}</div>
                        <div className={`text-[10px] opacity-80 leading-tight ${isWhatsApp ? 'text-green-50' : 'text-slate-500'}`}>En ligne</div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className={`h-full overflow-y-auto pb-32 px-3 pt-4 space-y-4 scrollbar-hide ${isWhatsApp ? 'bg-[#efeae2]' : 'bg-white'}`}>
                {/* Wallpaper Pattern for WhatsApp */}
                {isWhatsApp && (
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}
                    />
                )}

                {steps.map((step, idx) => (
                    <div key={idx} className="relative z-10 group">
                        {/* Time separator */}
                        <div className="flex justify-center mb-2">
                            <span className="text-[9px] bg-slate-200/50 px-2 py-0.5 rounded-full text-slate-500 font-medium">
                                +{step.delayInHours}h
                            </span>
                        </div>

                        {/* Message Bubble */}
                        <div className={`flex flex-col ${isWhatsApp ? 'items-start' : 'items-start'}`}>
                            <div className={`
                                max-w-[85%] rounded-lg p-2.5 text-xs shadow-sm relative
                                ${step.type === 'EMAIL'
                                    ? 'bg-amber-50 border border-amber-100 text-amber-900 w-full'
                                    : isWhatsApp
                                        ? 'bg-white rounded-tl-none'
                                        : 'bg-emerald-500 text-white rounded-br-none ml-auto'
                                }
                            `}>
                                {/* Label for Email */}
                                {step.type === 'EMAIL' && (
                                    <div className="border-b border-amber-200/50 pb-1 mb-1 font-bold text-[10px] flex justify-between">
                                        <span>📧 EMAIL</span>
                                        <span className="opacity-70 truncate max-w-[100px]">{step.subject}</span>
                                    </div>
                                )}

                                {isWhatsApp && !step.content && (
                                    <span className="text-slate-300 italic">Message vide...</span>
                                )}

                                <p className="leading-relaxed whitespace-pre-wrap break-words">
                                    {step.content || (step.type !== 'EMAIL' ? "Saisissez votre message..." : "Contenu de l'email...")}
                                </p>

                                {/* Timestamp */}
                                <div className={`text-[9px] text-right mt-1 ${isWhatsApp ? 'text-slate-400' : 'text-emerald-100'}`}>
                                    10:00
                                    {isWhatsApp && <span className="ml-1 text-blue-400">✓✓</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {steps.length === 0 && (
                    <div className="text-center mt-10 p-4 opacity-50 relative z-10">
                        <p className="text-xs text-slate-400">Ajoutez une étape pour prévisualiser le flux de conversation.</p>
                    </div>
                )}
            </div>

            {/* Input Area (Fake) */}
            <div className={`absolute bottom-0 inset-x-0 bg-slate-50 p-3 border-t flex gap-2 items-center z-20 pb-6`}>
                <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                <div className="flex-1 h-8 bg-white border rounded-full px-3 text-[10px] flex items-center text-slate-400">
                    Message...
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-blue-500 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                </div>
            </div>
        </div>
    );
}
