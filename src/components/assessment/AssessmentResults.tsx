'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Clock, GraduationCap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AssessmentResultsProps {
    resultLevel: string;
    score: number;
    recommendedHours: number;
    targetLevel: string;
}

export function AssessmentResults({ resultLevel, score, recommendedHours, targetLevel }: AssessmentResultsProps) {

    // Simple logic to determine color based on success
    const isTargetMet = resultLevel === targetLevel || resultLevel > targetLevel; // Assumes string comparison works alphabetically roughly right for Cefr (A < B < C) but better to use index if strict. For UI purposes, simple checks.

    // Convert CEFR to numeric weight for naive comparison
    const cefrWeight = (lvl: string) => ['A1_1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(lvl);
    const weightCurrent = cefrWeight(resultLevel);
    const weightTarget = cefrWeight(targetLevel);
    const progressPercent = Math.min(100, Math.max(0, (weightCurrent / weightTarget) * 100)) || 0;

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-lg shadow-emerald-900/10">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Test Terminé !</h1>
                <p className="text-slate-500">Merci d'avoir complété votre évaluation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Result Level Card */}
                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-gradient-to-br from-white to-slate-50 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <GraduationCap className="w-24 h-24" />
                    </div>
                    <CardHeader>
                        <CardDescription className="uppercase tracking-wider font-semibold text-xs text-slate-400">Votre Niveau</CardDescription>
                        <CardTitle className="text-6xl font-black text-slate-900 tracking-tighter">
                            {resultLevel}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            Score global : <Badge variant="secondary" className="font-mono">{score}%</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Gap Analysis Card */}
                <Card className="border-0 shadow-lg shadow-orange-900/5 bg-gradient-to-br from-white to-orange-50/30 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <CardHeader>
                        <CardDescription className="uppercase tracking-wider font-semibold text-xs text-slate-400">Recommandation</CardDescription>
                        <CardTitle className="text-4xl font-bold text-slate-900">
                            {recommendedHours}h
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                            <Clock className="w-4 h-4" />
                            Pour atteindre le niveau {targetLevel}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Target Progress */}
            <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Progression vers l'objectif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm font-medium text-slate-600">
                        <span>Niveau Actuel: {resultLevel}</span>
                        <span>Objectif: {targetLevel}</span>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                    <p className="text-xs text-slate-400 text-center pt-2">
                        {weightCurrent >= weightTarget
                            ? "Félicitations ! Vous avez déjà atteint ou dépassé le niveau requis."
                            : `Il vous manque encore ${weightTarget - weightCurrent} palier(s) pour atteindre votre objectif.`}
                    </p>
                </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => window.location.reload()}>
                    Retenter (Démo)
                </Button>
            </div>
        </div>
    );
}
