'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    Plus,
    Search,
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    ShieldCheck,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import { getPartnersAction, createPartnerAction, deletePartnerAction } from '@/application/actions/partner.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PartnerManagement() {
    const { activeOrganization } = useAuthStore();
    const [partners, setPartners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('OPCO');
    const [newSiret, setNewSiret] = useState('');
    const [newStreet, setNewStreet] = useState('');
    const [newZip, setNewZip] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeOrganization) loadPartners();
    }, [activeOrganization]);

    async function loadPartners() {
        setIsLoading(true);
        const res = await getPartnersAction(activeOrganization!.id);
        if (res.success) setPartners(res.data);
        setIsLoading(false);
    }

    async function handleAddPartner() {
        if (!newName || !activeOrganization) return;
        setIsSubmitting(true);
        const res = await createPartnerAction({
            organisationId: activeOrganization.id,
            name: newName,
            type: newType,
            siret: newSiret,
            street: newStreet,
            zipCode: newZip,
            city: newCity,
            contactEmail: newEmail
        });

        if (res.success) {
            alert("Partenaire ajouté avec succès");
            setIsAddOpen(false);
            loadPartners();
            resetForm();
        } else {
            alert("Erreur lors de l'ajout");
        }
        setIsSubmitting(false);
    }

    function resetForm() {
        setNewName('');
        setNewType('OPCO');
        setNewSiret('');
        setNewStreet('');
        setNewZip('');
        setNewCity('');
        setNewEmail('');
    }

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="text-indigo-600" size={28} />
                        Gestion des OPCO & Partenaires
                    </h1>
                    <p className="text-slate-500 font-medium">Répertoire des financeurs et partenaires institutionnels.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-200">
                    <Plus size={18} className="mr-2" /> Nouveau Partenaire
                </Button>
            </header>

            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <Input
                        placeholder="Rechercher un OPCO, une région..."
                        className="pl-10 rounded-xl bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPartners.map(partner => (
                        <Card key={partner.id} className="border-slate-200 hover:border-indigo-300 transition-all group rounded-2xl shadow-sm overflow-hidden">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900">{partner.name}</CardTitle>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                            {partner.type}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 rounded-lg">
                                    <Trash2 size={16} />
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                    <MapPin size={16} className="mt-0.5 text-slate-400" />
                                    <span>{partner.street ? `${partner.street}, ${partner.zipCode} ${partner.city}` : 'Adresse non renseignée'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <ShieldCheck size={16} className="text-slate-400" />
                                    <span className="font-mono text-xs">SIRET: {partner.siret || 'N/A'}</span>
                                </div>
                                {partner.contactEmail && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Mail size={16} className="text-slate-400" />
                                        <span>{partner.contactEmail}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                                        <CheckCircle2 size={12} /> Facturation Directe OK
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50 px-2 h-7 rounded-lg">Modifier</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ADD DIALOG */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Ajouter un Partenaire Financeur</DialogTitle>
                        <DialogDescription>Configurez les coordonnées de facturation pour vos OPCO ou financeurs publics.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Nom de l'organisme</label>
                            <Input placeholder="ex: OPCO Atlas, AKTO..." value={newName} onChange={e => setNewName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Type</label>
                                <Select value={newType} onValueChange={setNewType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPCO">OPCO</SelectItem>
                                        <SelectItem value="REGION">Région</SelectItem>
                                        <SelectItem value="POLE_EMPLOI">Pôle Emploi</SelectItem>
                                        <SelectItem value="AGEFIPH">AGEFIPH</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">SIRET</label>
                                <Input value={newSiret} onChange={e => setNewSiret(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Adresse (Facturation)</label>
                            <Input placeholder="Rue" value={newStreet} onChange={e => setNewStreet(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="Code Postal" value={newZip} onChange={e => setNewZip(e.target.value)} />
                            <Input placeholder="Ville" value={newCity} onChange={e => setNewCity(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Annuler</Button>
                        <Button onClick={handleAddPartner} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
