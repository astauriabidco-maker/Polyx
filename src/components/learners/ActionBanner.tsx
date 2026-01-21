import { AlertTriangle, Calendar, Euro, FileText, CheckCircle, Lock } from "lucide-react";
import { LearnerFolder } from "@/domain/entities/learner";
import { Button } from "@/components/ui/button";

interface ActionBannerProps {
    folder: LearnerFolder;
    onAction?: (action: string) => void;
}

export function ActionBanner({ folder, onAction }: ActionBannerProps) {
    const actions = [];

    // Action 1: Prêt à démarrer (Onboarding -> In Training)
    // OPTION B (Flexible): Allow starting even if docs are not 100% valid (Development Mode / Forced)
    if (folder.status === 'ONBOARDING') {
        const isComplianceOk = folder.complianceStatus === 'VALID';
        return (
            <div className={`border-l-4 ${isComplianceOk ? 'border-indigo-500 bg-indigo-50' : 'border-amber-500 bg-amber-50'} p-4 flex items-center justify-between shadow-sm my-4 rounded-r-md`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isComplianceOk ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isComplianceOk ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Prêt à démarrer la formation</h4>
                        <p className="text-sm text-slate-600">
                            {isComplianceOk
                                ? "Le dossier est complet. Vous pouvez lancer le parcours."
                                : "Attention : Le dossier administratif n'est pas encore validé."}
                        </p>
                    </div>
                </div>
                <Button onClick={() => onAction?.('START_TRAINING')} className={!isComplianceOk ? "bg-amber-600 hover:bg-amber-700" : ""}>
                    {isComplianceOk ? "Démarrer la formation" : "Forcer le démarrage"}
                </Button>
            </div>
        );
    }

    // Action 2: Inscription Examen (In Training -> Exam)
    // Constraint: Exam interactions are managed via external module (Sessions).
    // Here we just signal readiness or record the session date.
    if (folder.status === 'IN_TRAINING' && !folder.examDate) {
        return (
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 flex items-center justify-between shadow-sm my-4 rounded-r-md">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Inscription à l'examen requise</h4>
                        <p className="text-sm text-slate-600">L'apprenant est en cours de formation. Pensez à l'inscrire à une session.</p>
                    </div>
                </div>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => onAction?.('SCHEDULE_EXAM')}>
                    Inscrire à une session
                </Button>
            </div>
        );
    }

    // Action 3: Facturation (Completed -> Invoiced)
    // Constraint: Can ONLY invoice if CDC status is 'SERVICE_FAIT_VALIDE' (for CPF).
    if (folder.status === 'COMPLETED' && !folder.invoicedDate) {
        const isCpf = folder.fundingType === 'CPF';
        const isCdcValidated = folder.cpfProgressStatus === 'SERVICE_FAIT_VALIDE';

        // Blocking state for CPF
        if (isCpf && !isCdcValidated) {
            return (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 flex items-center justify-between shadow-sm my-4 rounded-r-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">En attente de validation CDC</h4>
                            <p className="text-sm text-slate-600">
                                La facturation est bloquée tant que le "Service Fait" n'est pas validé par la Caisse des Dépôts.
                            </p>
                        </div>
                    </div>
                    {/* No Action Button - Passive Wait */}
                </div>
            );
        }

        // Available for Billing (Non-CPF or Validated CPF)
        return (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 flex items-center justify-between shadow-sm my-4 rounded-r-md">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                        <Euro size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Prêt à facturer</h4>
                        <p className="text-sm text-slate-600">La formation est terminée et validée. Vous pouvez émettre la facture.</p>
                    </div>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onAction?.('BILLING')}>
                    Générer la facture
                </Button>
            </div>
        );
    }

    // "Bloqué" or "Niveau Insuffisant" are separate flags, handled in StatusManager.

    // Here we focus on ACTIONABLE items necessary to move the pipeline forward.

    // Action 4: Dossier Incomplet ou En Attente (Administrative Blocker)
    // If not valid, we generally need to fix docs before starting.
    if (folder.complianceStatus !== 'VALID') {
        const isPending = folder.complianceStatus === 'PENDING';
        return (
            <div className={`border-l-4 p-4 flex items-center justify-between shadow-sm my-4 rounded-r-md ${isPending ? 'bg-amber-50 border-amber-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">
                            {isPending ? 'Dossier en attente' : 'Dossier Administratif Incomplet'}
                        </h4>
                        <p className="text-sm text-slate-600">
                            {isPending ? 'En attente de validation des pièces justificatives.' : 'Des pièces justificatives sont manquantes ou rejetées.'}
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="outline" className={`${isPending ? 'text-amber-600 border-amber-200 hover:bg-amber-100' : 'text-red-600 border-red-200 hover:bg-red-100'}`} onClick={() => onAction?.('DOCS')}>
                    Gérer les pièces
                </Button>
            </div>
        );
    }

    // No actions? Return null.
    return null;
}
