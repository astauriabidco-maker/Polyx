'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loginAction } from '@/application/actions/auth.actions';
import { useAuthStore } from '@/application/store/auth-store';
import { User } from '@/domain/entities/user';

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
                // Map to Domain User
                const domainUser: User = {
                    id: result.user.id,
                    email: result.user.email,
                    firstName: result.user.firstName || '',
                    lastName: result.user.lastName || '',
                    isActive: result.user.isActive,
                    createdAt: new Date(result.user.createdAt),
                    updatedAt: new Date(result.user.updatedAt),
                    memberships: [result.membership],
                    lastLogin: new Date()
                };

                // Sync with Client Store
                login(domainUser, result.organization, result.membership, result.permissions);
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
