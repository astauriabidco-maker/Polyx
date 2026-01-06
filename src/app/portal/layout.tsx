import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Portail Entreprise - Polyx Formation",
    description: "Espace client B2B",
};

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`min-h-screen bg-slate-50 ${inter.className}`}>
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            P
                        </div>
                        <span className="font-bold text-slate-900 text-lg">Polyx<span className="text-indigo-600">Corp</span></span>
                        <span className="ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 uppercase font-bold tracking-wider">
                            Espace Entreprise
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <a href="/portal/dashboard" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Tableau de Bord</a>
                        <a href="/portal/employees" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Mes Collaborateurs</a>
                        <a href="/portal/invoices" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Facturation</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                            RH
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            <Toaster />
        </div>
    );
}
