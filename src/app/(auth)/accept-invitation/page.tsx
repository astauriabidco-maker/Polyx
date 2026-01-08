'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getInvitationAction, acceptInvitationAction } from '@/application/actions/auth.actions';
import {
    Building2,
    Mail,
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';

export default function AcceptInvitationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'success'>('loading');
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError('Aucun token d\'invitation fourni.');
            return;
        }
        validateToken();
    }, [token]);

    const validateToken = async () => {
        const result = await getInvitationAction(token!);
        if (result.success && result.invitation) {
            setInvitation(result.invitation);
            setStatus('valid');
        } else {
            setError(result.error || 'Invitation invalide');
            setStatus('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const result = await acceptInvitationAction({
            token: token!,
            firstName,
            lastName,
            password
        });

        if (result.success) {
            setStatus('success');
            // Redirect after 2 seconds
            setTimeout(() => {
                router.push(result.redirectUrl || '/app/dashboard');
            }, 2000);
        } else {
            setError(result.error || 'Erreur lors de la création du compte');
        }

        setIsSubmitting(false);
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-12">
                    <CardContent>
                        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">Vérification de l'invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-8 pb-6 text-center">
                        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation invalide</h2>
                        <p className="text-slate-500 mb-6">{error}</p>
                        <Button onClick={() => router.push('/login')} variant="outline">
                            Retour à la connexion
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-8 pb-6 text-center">
                        <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Compte créé avec succès !</h2>
                        <p className="text-slate-500 mb-2">Bienvenue chez <strong>{invitation?.organisationName}</strong></p>
                        <p className="text-sm text-slate-400">Redirection en cours...</p>
                        <Loader2 className="h-5 w-5 text-emerald-600 animate-spin mx-auto mt-4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Valid invitation - Show form
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl border-slate-200">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 h-16 w-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-900">
                        Rejoindre {invitation?.organisationName}
                    </CardTitle>
                    <CardDescription className="text-base">
                        Créez votre compte pour accéder à la plateforme
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    {/* Invitation Info */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{invitation?.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">Rôle : </span>
                            <Badge variant="secondary" className="font-medium">
                                {invitation?.roleName}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-400">
                                Expire le {new Date(invitation?.expiresAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Prénom</label>
                                <Input
                                    placeholder="Jean"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Nom</label>
                                <Input
                                    placeholder="Dupont"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Mot de passe</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">Confirmer le mot de passe</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    Créer mon compte
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-xs text-center text-slate-400 mt-6">
                        En créant votre compte, vous acceptez les conditions d'utilisation de Polyx.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
