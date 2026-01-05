'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loginAction } from '@/application/actions/auth.actions';
import { useAuthStore } from '@/application/store/auth-store';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        try {
            const result = await loginAction(formData);
            if (result.success && result.user && result.organization && result.membership && result.permissions) {
                // Sync with Client Store
                login(result.user, result.organization, result.membership, result.permissions);
                router.push('/app/dashboard');
            } else {
                const msg = result.error || 'Erreur de connexion inconnue.';
                setError(msg);
                console.error("[Login Error]", msg, result);
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome back to Polyx</CardTitle>
                    <CardDescription>Sign in to your organization workspace</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <Input
                            name="email"
                            type="email"
                            label="Email address"
                            placeholder="name@company.com"
                            required
                        />
                        <Input
                            name="password"
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            required
                        />
                        {error && <div className="text-red-500 text-sm">{error}</div>}

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-slate-500">
                        Don't have an account? <a href="/register" className="text-indigo-600 hover:underline">Register your Organization</a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
