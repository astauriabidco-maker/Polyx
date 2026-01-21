
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTrainingSessionAction, getFormateursAction, getTrainingsAction } from "@/application/actions/attendance.actions";
import { useAuthStore } from "@/application/store/auth-store";
import { useToast } from "@/components/ui/use-toast";

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    activeAgencyId?: string;
}

export function CreateSessionModal({ isOpen, onClose, onCreated, activeAgencyId }: CreateSessionModalProps) {
    const { activeOrganization } = useAuthStore();
    const { toast } = useToast();
    const [formateurs, setFormateurs] = useState<any[]>([]);
    const [trainings, setTrainings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        trainingId: "",
        formateurId: "",
        date: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "12:00",
        location: "Distanciel"
    });

    useEffect(() => {
        if (isOpen && activeOrganization?.id) {
            loadData();
        }
    }, [isOpen, activeOrganization?.id]);

    async function loadData() {
        const [fRes, tRes] = await Promise.all([
            getFormateursAction(activeOrganization!.id),
            getTrainingsAction(activeOrganization!.id)
        ]);
        if (fRes.success) setFormateurs(fRes.formateurs || []);
        if (tRes.success) setTrainings(tRes.trainings || []);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!activeOrganization?.id) return;

        setLoading(true);
        const selectedFormateur = formateurs.find(f => f.id === formData.formateurId);

        const res = await createTrainingSessionAction({
            ...formData,
            organisationId: activeOrganization.id,
            date: new Date(formData.date),
            formateurName: selectedFormateur ? `${selectedFormateur.firstName} ${selectedFormateur.lastName}` : undefined,
            agencyId: activeAgencyId || ""
        });

        if (res.success) {
            toast({ title: "Session créée", description: "La session d'émargement est ouverte." });
            onCreated();
            onClose();
        } else {
            toast({ title: "Erreur", description: "Impossible de créer la session.", variant: "destructive" });
        }
        setLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Ouvrir une session d'émargement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Titre de la session (ex: Module 1)</Label>
                        <Input
                            placeholder="Introduction..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Formation</Label>
                            <Select onValueChange={v => setFormData({ ...formData, trainingId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Formateur</Label>
                            <Select onValueChange={v => setFormData({ ...formData, formateurId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {formateurs.map(f => <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Début</Label>
                            <Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Fin</Label>
                            <Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Lieu / Modalité</Label>
                        <Input placeholder="Distanciel, Salle 4..." value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading ? "Création..." : "Créer la session"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
