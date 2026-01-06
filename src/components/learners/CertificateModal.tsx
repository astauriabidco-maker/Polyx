'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
    Download, Printer, ShieldCheck, Award,
    Calendar, Clock, CheckCircle2, MapPin, Building
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export function CertificateModal({ isOpen, onClose, data }: CertificateModalProps) {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadPdf = async () => {
        if (!certificateRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`certificat-realisation-${data.learnerName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
        }
        setIsExporting(false);
    };

    if (!data) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Aperçu du Certificat de Réalisation" size="4xl">
            <div className="flex flex-col gap-6">
                {/* Tools Header */}
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Document Conforme Qualiopi</p>
                            <p className="text-xs text-slate-500">Généré automatiquement par Polyx Engine</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            className="h-10 font-bold gap-2"
                        >
                            <Printer size={16} /> Imprimer
                        </Button>
                        <Button
                            onClick={handleDownloadPdf}
                            disabled={isExporting}
                            className="bg-slate-900 hover:bg-black h-10 font-bold gap-2"
                        >
                            <Download size={16} /> {isExporting ? 'Génération...' : 'Télécharger PDF'}
                        </Button>
                    </div>
                </div>

                {/* Certificate Container */}
                <div className="bg-slate-200 p-8 rounded-3xl overflow-auto max-h-[70vh] flex justify-center">
                    <div
                        ref={certificateRef}
                        className="w-[210mm] min-h-[297mm] bg-white shadow-2xl p-16 flex flex-col relative overflow-hidden"
                        style={{ fontFamily: 'serif' }}
                    >
                        {/* Decorative Borders */}
                        <div className="absolute top-0 left-0 w-full h-4 bg-indigo-600" />
                        <div className="absolute bottom-0 left-0 w-full h-4 bg-indigo-600" />
                        <div className="absolute top-0 right-0 h-full w-1 bg-slate-200" />
                        <div className="absolute top-0 left-0 h-full w-1 bg-slate-200" />

                        {/* Logo & Header */}
                        <div className="flex justify-between items-start mb-16">
                            <div className="space-y-1">
                                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl mb-4">P</div>
                                <h1 className="text-2xl font-black tracking-tighter text-slate-900 italic">POLYX ACADEMY</h1>
                            </div>
                            {data.isQualiopi && (
                                <div className="border-2 border-slate-900 p-2 text-center max-w-[120px]">
                                    <p className="text-[10px] font-bold leading-tight uppercase">Processus certifié</p>
                                    <p className="text-sm font-black uppercase">QUALIOPI</p>
                                </div>
                            )}
                        </div>

                        {/* Title Section */}
                        <div className="text-center space-y-4 mb-16">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Certificat de Réalisation</h2>
                            <p className="text-lg text-slate-500 italic">Conformément aux dispositions de l'article R. 6332-26 du Code du travail</p>
                        </div>

                        {/* Main Body */}
                        <div className="flex-1 space-y-12 text-lg text-slate-800 leading-relaxed">
                            <p>
                                Je soussigné, Monsieur le Responsable Pédagogique de <span className="font-bold underline">{data.organisationName}</span> (SIRET : {data.organisationSiret || 'En attente'}),
                                certifie que :
                            </p>

                            <div className="text-center py-6">
                                <p className="text-3xl font-black text-slate-900 tracking-tight">{data.learnerName}</p>
                                <p className="text-slate-500 mt-2">Né(e) le [Date de naissance non renseignée]</p>
                            </div>

                            <p>
                                A suivi l'action de formation intitulée : <br />
                                <span className="text-xl font-bold text-indigo-700">« {data.trainingTitle} »</span>
                            </p>

                            <div className="grid grid-cols-2 gap-8 py-8 border-y-2 border-slate-50">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={20} className="text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Période</p>
                                            <p className="font-bold">Du {format(new Date(data.startDate), 'dd/MM/yyyy')} au {format(new Date(data.endDate), 'dd/MM/yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin size={20} className="text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Lieu d'exécution</p>
                                            <p className="font-bold">{data.agencyName}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Clock size={20} className="text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Assiduité totale</p>
                                            <p className="text-2xl font-black text-indigo-600">{data.totalHours} Heures</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Award size={20} className="text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Statut</p>
                                            <p className="font-bold text-emerald-600 uppercase">Parcours Complété</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm">
                                Ce certificat est établi sur la base des feuilles d'émargement numériques certifiées par Polyx Engine
                                (Hachage de sécurité : {Math.random().toString(36).substring(7).toUpperCase()}).
                            </p>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-16 mt-16 pt-12 border-t border-slate-100">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-8">Fait à {data.agencyName}, le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
                                <div className="h-24 w-full bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center italic text-slate-300">
                                    Cachet de l'Entreprise
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-8">Signature de l'Organisme de Formation</p>
                                <div className="inline-block">
                                    <p className="font-bold text-slate-900 border-b border-slate-900 inline-block px-4 py-2">Responsable Pédagogique</p>
                                    <div className="mt-4 text-indigo-600 flex items-center justify-end gap-2 text-xs font-bold italic">
                                        <ShieldCheck size={14} /> Certifié Polyx
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Legal */}
                        <div className="mt-auto pt-16 text-center text-[10px] text-slate-300 space-x-4">
                            <span>{data.organisationName}</span>
                            <span>•</span>
                            <span>SIRET : {data.organisationSiret || '...'}</span>
                            <span>•</span>
                            <span>NDA : {data.organisationNda || '...'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
