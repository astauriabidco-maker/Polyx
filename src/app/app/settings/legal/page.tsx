'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LegalDocument } from '@/infrastructure/mock-db';
import { getLegalDocumentsAction, createLegalDocumentVersionAction, publishLegalDocumentVersionAction, updateLegalDocumentAction } from '@/application/actions/legal.actions';
import { Plus, CheckCircle, Eye, Edit } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function LegalSettingsPage() {
    const [activeTab, setActiveTab] = useState<'DPA' | 'CGU'>('DPA');
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadDocuments = async () => {
        setIsLoading(true);
        const res = await getLegalDocumentsAction(activeTab);
        if (res.success && res.documents) {
            setDocuments(res.documents);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadDocuments();
    }, [activeTab]);

    const handlePublish = async (id: string, version: string) => {
        if (!confirm(`Voulez-vous vraiment publier la version ${version} ? Cela remplacera la version active actuelle.`)) return;

        const res = await publishLegalDocumentVersionAction(id);
        if (res.success) {
            alert(`Version ${version} publiée avec succès`);
            loadDocuments();
        } else {
            alert("Erreur lors de la publication");
        }
    };

    const handleCreateDraft = async () => {
        const lastDoc = documents[0];
        const defaultSections = lastDoc ? lastDoc.sections : [{ title: "Titre section", content: "Contenu..." }];

        const res = await createLegalDocumentVersionAction(activeTab, "Nouveau document", defaultSections);
        if (res.success) {
            alert("Nouvelle version brouillon créée");
            loadDocuments();
        } else {
            alert("Erreur à la création");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Documents Légaux</h1>
                <p className="text-slate-500">Gérez les versions des contrats (DPA) et conditions générales (CGU).</p>
            </div>

            {/* Custom Tabs */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                        {(['DPA', 'CGU'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                {tab === 'DPA' ? 'DPA (Sous-traitance)' : 'CGU (Utilisation)'}
                            </button>
                        ))}
                    </div>
                    <Button onClick={handleCreateDraft} className="gap-2">
                        <Plus size={16} /> Nouvelle Version (Draft)
                    </Button>
                </div>

                <DocumentList
                    documents={documents}
                    isLoading={isLoading}
                    onPublish={handlePublish}
                    onRefresh={loadDocuments}
                />
            </div>
        </div>
    );
}

function DocumentList({ documents, isLoading, onPublish, onRefresh }: {
    documents: LegalDocument[],
    isLoading: boolean,
    onPublish: (id: string, v: string) => void,
    onRefresh: () => void
}) {
    if (isLoading) return <div>Chargement...</div>;
    if (documents.length === 0) return <div>Aucun document trouvé. Créez-en un.</div>;

    return (
        <div className="grid gap-4">
            {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onPublish={onPublish} onRefresh={onRefresh} />
            ))}
        </div>
    );
}

function DocumentCard({ doc, onPublish, onRefresh }: {
    doc: LegalDocument,
    onPublish: (id: string, v: string) => void,
    onRefresh: () => void
}) {
    let status = 'ARCHIVED';
    let statusClass = "bg-slate-100 text-slate-600 border-slate-200";

    if (doc.isActive) {
        status = 'ACTIVE';
        statusClass = "bg-green-100 text-green-700 border-green-200";
    } else if (!doc.publishedAt) {
        status = 'DRAFT';
        statusClass = "bg-amber-100 text-amber-700 border-amber-200";
    }

    return (
        <Card className={`border-l-4 ${doc.isActive ? 'border-l-green-500' : 'border-l-slate-200'}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={statusClass}>
                                {status}
                            </Badge>
                            <span className="font-mono text-sm font-bold">{doc.version}</span>
                        </div>
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription>
                            Créé le {new Date(doc.createdAt).toLocaleDateString()}
                            {doc.publishedAt && ` • Publié le ${new Date(doc.publishedAt).toLocaleDateString()}`}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {status === 'DRAFT' && (
                            <Button size="sm" onClick={() => onPublish(doc.id, doc.version)} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle size={16} className="mr-2" /> Publier
                            </Button>
                        )}
                        <EditDocumentDialog doc={doc} onRefresh={onRefresh} readOnly={status !== 'DRAFT'} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-slate-500">
                    {doc.sections.length} sections • {doc.sections.reduce((acc, s) => acc + s.content.length, 0)} caractères
                </div>
            </CardContent>
        </Card>
    );
}

function EditDocumentDialog({ doc, onRefresh, readOnly }: { doc: LegalDocument, onRefresh: () => void, readOnly: boolean }) {
    const [sections, setSections] = useState(doc.sections);
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = async () => {
        await updateLegalDocumentAction(doc.id, sections);
        alert("Modifications enregistrées");
        setIsOpen(false);
        onRefresh();
    };

    const handleSectionChange = (index: number, field: 'title' | 'content', value: string) => {
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setSections(newSections);
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                {readOnly ? <Eye size={16} className="mr-2" /> : <Edit size={16} className="mr-2" />}
                {readOnly ? 'Voir' : 'Éditer'}
            </Button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={readOnly ? `Visualiser ${doc.version}` : `Éditer ${doc.version}`}>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {sections.map((section, idx) => (
                        <div key={idx} className="p-4 border rounded-md bg-slate-50 space-y-3">
                            <div className="space-y-1">
                                <Label>Titre Section {idx + 1}</Label>
                                <Input
                                    value={section.title}
                                    onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Contenu</Label>
                                <Textarea
                                    value={section.content}
                                    className="min-h-[100px]"
                                    onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    ))}
                    {!readOnly && (
                        <Button
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => setSections([...sections, { title: "Nouvelle section", content: "" }])}
                        >
                            <Plus size={16} className="mr-2" /> Ajouter une section
                        </Button>
                    )}
                </div>

                {!readOnly && (
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Annuler</Button>
                        <Button onClick={handleSave}>Enregistrer</Button>
                    </div>
                )}
            </Modal>
        </>
    );
}
