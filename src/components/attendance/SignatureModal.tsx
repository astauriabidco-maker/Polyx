'use client';

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureData: string) => void;
    learnerName: string;
}

export function SignatureModal({ isOpen, onClose, onSign, learnerName }: SignatureModalProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            onSign(dataUrl);
            onClose(); // Close after signing
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col sm:h-[600px]">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold text-center text-indigo-700">
                        Signature de {learnerName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl relative overflow-hidden touch-none">
                    {/* Placeholder Text */}
                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-slate-300 text-4xl font-bold opacity-30 uppercase rotate-[-15deg]">
                                Signer ici avec le doigt
                            </p>
                        </div>
                    )}

                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        backgroundColor="transparent"
                        canvasProps={{
                            className: "w-full h-full cursor-crosshair active:cursor-grabbing",
                            style: { width: '100%', height: '100%' }
                        }}
                        onBegin={() => setIsEmpty(false)}
                    />
                </div>

                <DialogFooter className="mt-4 flex gap-4 sm:justify-between items-center w-full">
                    <Button
                        variant="ghost"
                        onClick={clear}
                        className="text-slate-500 hover:text-red-500"
                    >
                        <Eraser className="mr-2 h-5 w-5" /> Effacer
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} >
                            Annuler
                        </Button>
                        <Button
                            onClick={save}
                            disabled={isEmpty}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg"
                        >
                            <Check className="mr-2 h-6 w-6" /> Valider la présence
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
