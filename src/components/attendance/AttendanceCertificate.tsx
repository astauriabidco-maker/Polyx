
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, Award, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface AttendanceCertificateProps {
    learner: {
        firstName: string;
        lastName: string;
    };
    folder: {
        trainingTitle: string;
        officialStartDate?: Date | null;
        actualEndDate?: Date | null;
        trainingDuration?: number | null;
        hoursUsed: number;
    };
    organisation: {
        name: string;
        nda?: string | null;
        city?: string | null;
        logo?: string | null;
    };
}

export function AttendanceCertificate({ learner, folder, organisation }: AttendanceCertificateProps) {
    const [exporting, setExporting] = useState(false);

    const downloadPDF = async () => {
        const element = document.getElementById(`certificate-${learner.lastName}`);
        if (!element) return;

        setExporting(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`Attestation_${learner.lastName}_${learner.firstName}.pdf`);
        } catch (error) {
            console.error("Certificate Export Error:", error);
        }
        setExporting(false);
    };

    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-4">
            <Button
                onClick={downloadPDF}
                disabled={exporting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
                {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                Générer l'Attestation d'Assiduité
            </Button>

            {/* Hidden Certificate Preview for Export */}
            <div className="fixed left-[-9999px] top-0">
                <div
                    id={`certificate-${learner.lastName}`}
                    className="w-[297mm] h-[210mm] bg-white p-12 flex flex-col items-center justify-between border-[16px] border-double border-indigo-900 relative overflow-hidden"
                >
                    {/* Watermark/Background Decoration */}
                    <div className="absolute top-[-50px] right-[-50px] opacity-[0.03] rotate-12">
                        <Award size={600} className="text-indigo-900" />
                    </div>

                    {/* Header */}
                    <div className="w-full flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-indigo-900 rounded-full flex items-center justify-center text-white font-black text-2xl italic">P</div>
                            <div>
                                <h2 className="text-2xl font-black text-indigo-900 tracking-tighter uppercase italic">{organisation.name}</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Organisme de Formation • NDA: {organisation.nda || '---'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-indigo-900 text-white px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">Certificat Officiel</div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-4xl">
                        <h1 className="text-5xl font-black text-slate-900 mb-2 uppercase tracking-tight">Attestation de Présence</h1>
                        <p className="text-xl text-slate-600 italic">Nous soussignés, <span className="font-bold text-slate-900 not-italic">{organisation.name}</span>, certifions que :</p>

                        <div>
                            <p className="text-4xl font-black text-indigo-700 leading-none">{learner.lastName.toUpperCase()} {learner.firstName}</p>
                            <div className="h-1 w-24 bg-indigo-100 mx-auto mt-4" />
                        </div>

                        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                            A suivi avec assiduité l'action de formation intitulée :<br />
                            <span className="text-2xl font-bold text-slate-900 not-italic mt-2 block">"{folder.trainingTitle}"</span>
                        </p>

                        <div className="grid grid-cols-3 gap-12 w-full border-y border-slate-100 py-8 mt-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Période</p>
                                <p className="text-sm font-bold text-slate-800">Du {folder.officialStartDate ? new Date(folder.officialStartDate).toLocaleDateString('fr-FR') : '---'} au {folder.actualEndDate ? new Date(folder.actualEndDate).toLocaleDateString('fr-FR') : '---'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Volume Prévu</p>
                                <p className="text-sm font-bold text-slate-800">{folder.trainingDuration || '--'} heures</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Volume Réalisé</p>
                                <p className="text-sm font-black text-emerald-600">{folder.hoursUsed} heures émargées</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="w-full grid grid-cols-2 gap-20 items-end px-10">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 italic">Fait à {organisation.city || 'Paris'}, le {today}</p>
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle size={16} />
                                <span className="text-[10px] font-bold uppercase">Document conforme Qualiopi</span>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-12">Signature et Cachet de l'OF</p>
                            <div className="h-24 w-48 border border-dashed border-slate-200 flex items-center justify-center p-2">
                                {/* Seal placeholder */}
                                <div className="border-4 border-indigo-900/10 rounded-full p-2 rotate-[-15deg]">
                                    <p className="text-[8px] font-black text-indigo-900/20 uppercase tracking-tighter leading-none text-center">CERTIFIÉ CONFORME<br />POLYX FORMATION</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
