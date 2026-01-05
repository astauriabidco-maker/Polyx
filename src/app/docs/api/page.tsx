import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/app/settings/integrations" className="text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            Polyx API Reference
                        </h1>
                    </div>
                    <Badge variant="outline" className="text-indigo-300 border-indigo-500/50">v1.0</Badge>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="prose prose-slate max-w-none">

                    {/* Intro */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Introduction</h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            Cette API permet aux partenaires externes d'injecter des leads directement dans l'écosystème Polyx.
                            L'authentification se fait via une clé API unique fournie par votre administrateur.
                        </p>
                        <div className="mt-6 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r text-indigo-900">
                            <strong>Authentification :</strong> Ajoutez l'en-tête <code>X-API-Key</code> à toutes vos requêtes.
                        </div>
                    </div>

                    <hr className="my-12 border-slate-200" />

                    {/* Endpoints */}
                    <div className="space-y-16">

                        {/* 1. Bulk Leads */}
                        <section id="bulk-leads">
                            <div className="flex items-center gap-3 mb-6">
                                <Badge className="bg-green-600 hover:bg-green-700 text-sm py-1">POST</Badge>
                                <h3 className="text-2xl font-bold text-slate-900 m-0">/api/v1/leads/bulk</h3>
                            </div>

                            <p className="text-slate-600 mb-6">
                                Permet la création de leads en masse. C'est le point d'entrée principal pour les apporteurs d'affaires et les campagnes marketing.
                            </p>

                            <Card className="mb-8 overflow-hidden border-slate-200 shadow-sm">
                                <CardHeader className="bg-slate-50 border-b border-slate-100">
                                    <CardTitle className="text-sm font-mono text-slate-500 uppercase">Exemple de Payload</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <pre className="p-6 bg-slate-950 text-slate-50 overflow-x-auto text-sm">
                                        {`{
  "leads": [
    {
      "first_name": "Jean",
      "last_name": "Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33600000001",
      "zip": "75015",
      "city": "Paris",
      "street": "10 rue de Paris",
      "examen_id": 12,
      "branch_id": 3,
      "source": "terrain",
      "date_consentement": "2025-12-01",
      "date_reponse": "2025-12-15"
    }
  ]
}`}
                                    </pre>
                                </CardContent>
                            </Card>

                            <h4 className="font-bold text-slate-900 mb-4">Champs Requis</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-100/50">
                                            <th className="py-3 px-4 font-semibold text-slate-700">Champ</th>
                                            <th className="py-3 px-4 font-semibold text-slate-700">Type</th>
                                            <th className="py-3 px-4 font-semibold text-slate-700">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">first_name</td>
                                            <td className="py-3 px-4 text-slate-500">string</td>
                                            <td className="py-3 px-4 text-slate-700">Prénom du prospect</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">email</td>
                                            <td className="py-3 px-4 text-slate-500">string</td>
                                            <td className="py-3 px-4 text-slate-700">Email unique</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">phone</td>
                                            <td className="py-3 px-4 text-slate-500">string</td>
                                            <td className="py-3 px-4 text-slate-700">Format international recommandé</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">examen_id</td>
                                            <td className="py-3 px-4 text-slate-500">integer</td>
                                            <td className="py-3 px-4 text-slate-700">ID de l'examen visé (voir endpoint /examens)</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">branch_id</td>
                                            <td className="py-3 px-4 text-slate-500">integer</td>
                                            <td className="py-3 px-4 text-slate-700">ID de l'agence de rattachement</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-mono text-indigo-600">date_reponse</td>
                                            <td className="py-3 px-4 text-slate-500">date (YYYY-MM-DD)</td>
                                            <td className="py-3 px-4 text-slate-700">Détermine si le lead est PROSPECT (&gt;30j) ou CRM (&lt;30j)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <hr className="my-12 border-slate-200" />

                        {/* 2. Configuration Data */}
                        <section className="grid md:grid-cols-2 gap-12">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">GET</Badge>
                                    <h3 className="text-xl font-bold text-slate-900 m-0">/api/v1/branches</h3>
                                </div>
                                <p className="text-slate-600 text-sm mb-4">
                                    Retourne la liste des agences ("branches") autorisées pour votre clé API.
                                </p>
                                <pre className="p-4 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200">
                                    {`{
  "success": true,
  "branches": [
    {"id": 3, "name": "SAINT DENIS"},
    {"id": 5, "name": "PARIS"}
  ]
}`}
                                </pre>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">GET</Badge>
                                    <h3 className="text-xl font-bold text-slate-900 m-0">/api/v1/examens</h3>
                                </div>
                                <p className="text-slate-600 text-sm mb-4">
                                    Retourne la liste des certifications et examens disponibles.
                                </p>
                                <pre className="p-4 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200">
                                    {`{
  "success": true,
  "examens": [
    {"id": 12, "name": "TOEIC", "default_code": "TOEIC-A"},
    {"id": 18, "name": "BRIGHT", "default_code": ""}
  ]
}`}
                                </pre>
                            </div>
                        </section>

                        <hr className="my-12 border-slate-200" />

                        {/* 3. Logic & Routing */}
                        <section>
                            <h3 className="text-2xl font-bold text-slate-900 mb-6">Logique de Routage</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="bg-orange-50 border-orange-200">
                                    <CardHeader>
                                        <CardTitle className="text-orange-900 text-lg">Route Prospection</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-orange-800/80 text-sm">
                                            Si <code>date_reponse</code> est antérieure à 30 jours.
                                            <br />
                                            Le lead est stocké comme "Froid" pour relance future via call center.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-emerald-50 border-emerald-200">
                                    <CardHeader>
                                        <CardTitle className="text-emerald-900 text-lg">Route CRM (Hot)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-emerald-800/80 text-sm">
                                            Si <code>date_reponse</code> est dans les 30 derniers jours.
                                            <br />
                                            Le lead est injecté directement dans le pipeline commercial actif.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
                    <p>&copy; {new Date().getFullYear()} Polyx Academy Tech. Documentation confidentielle.</p>
                </footer>
            </main>
        </div>
    );
}
