'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { registerOrganizationAction } from '@/application/actions/auth.actions';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // We handle form data manually to support multi-step simpler than using hidden inputs
    const [formData, setFormData] = useState({
        orgName: '',
        siret: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload = new FormData();
        Object.entries(formData).forEach(([key, value]) => payload.append(key, value));

        try {
            const result = await registerOrganizationAction(payload);
            if (result.success) {
                // Redirect to login or success page
                router.push('/login?registered=true');
            } else {
                setError(result.error || 'Registration failed');
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Create Organization</CardTitle>
                        <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600">Step {step} of 2</span>
                    </div>
                    <CardDescription>Get started with Polyx for your training center</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">

                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <Input
                                    name="orgName"
                                    label="Organization Name"
                                    placeholder="ACME Academy"
                                    value={formData.orgName}
                                    onChange={handleChange}
                                    required
                                    autoFocus
                                />
                                <Input
                                    name="siret"
                                    label="SIRET Number"
                                    placeholder="14 digits"
                                    value={formData.siret}
                                    onChange={handleChange}
                                    required
                                />
                                <Button type="button" className="w-full mt-4" onClick={() => {
                                    if (formData.orgName && formData.siret) setStep(2);
                                }}>
                                    Next: Admin Details
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        name="adminFirstName"
                                        label="First Name"
                                        value={formData.adminFirstName}
                                        onChange={handleChange}
                                        required
                                        autoFocus
                                    />
                                    <Input
                                        name="adminLastName"
                                        label="Last Name"
                                        value={formData.adminLastName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <Input
                                    name="adminEmail"
                                    type="email"
                                    label="Professional Email"
                                    value={formData.adminEmail}
                                    onChange={handleChange}
                                    required
                                />
                                <Input
                                    name="adminPassword"
                                    type="password"
                                    label="Password"
                                    value={formData.adminPassword}
                                    onChange={handleChange}
                                    required
                                />

                                {error && <div className="text-red-500 text-sm">{error}</div>}

                                <div className="flex gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                        Back
                                    </Button>
                                    <Button type="submit" className="flex-1" isLoading={isLoading}>
                                        Complete Registration
                                    </Button>
                                </div>
                            </div>
                        )}

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
