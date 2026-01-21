'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DialerWidget() {
    const [isCalling, setIsCalling] = useState(false);

    return (
        <Card className="fixed bottom-4 right-4 w-80 shadow-2xl border-t-4 border-indigo-600">
            <CardHeader className="py-3 bg-slate-50 border-b">
                <CardTitle className="text-sm">Polyx Smart Dialer</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center gap-4">
                <div className="text-center">
                    <div className="text-2xl font-mono text-slate-800">06 12 34 56 78</div>
                    <div className="text-xs text-slate-500">Calling Sophie Martin...</div>
                </div>

                <div className="flex gap-4 w-full">
                    <Button
                        variant={isCalling ? "secondary" : "primary"}
                        className={`w-full ${isCalling ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => setIsCalling(!isCalling)}
                    >
                        {isCalling ? 'End Call' : 'Start Call'}
                    </Button>
                </div>

                {isCalling && (
                    <div className="w-full bg-slate-100 p-2 rounded text-xs text-slate-500 italic">
                        IA Transcription active...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
