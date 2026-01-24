import { notFound } from 'next/navigation';
import { getAssessmentSessionAction, submitAssessmentAction, getAssessmentQuestionsAction } from '@/application/actions/assessment.actions';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';
import { AssessmentResults } from '@/components/assessment/AssessmentResults';

// Ensure dynamic rendering for this route
export const dynamic = 'force-dynamic';

export default async function AssessmentPage({ params }: { params: { token: string } }) {
    // 1. Verify Token & Session
    const sessionRes = await getAssessmentSessionAction(params.token);

    if (!sessionRes.success || !sessionRes.data) {
        return notFound();
    }

    const session = sessionRes.data;

    // 2. If Completed, Show Results
    if (session.status === 'COMPLETED') {
        const resultLevel = session.resultLevel || 'A1';
        const score = session.score || 0;
        const recommendedHours = session.recommendedHours || 0;
        const targetLevel = session.targetLevel || 'B1';

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
                <AssessmentResults
                    resultLevel={resultLevel as string}
                    score={score}
                    recommendedHours={recommendedHours}
                    targetLevel={targetLevel as string}
                />
            </div>
        );
    }

    // 3. If Pending, Load Questions and Show Wizard
    const questionsRes = await getAssessmentQuestionsAction();
    if (!questionsRes.success || !questionsRes.data) {
        return <div className="p-8 text-center text-red-500">Erreur lors du chargement des questions.</div>;
    }

    const questions = questionsRes.data.map((q: any) => ({
        id: q.id,
        content: q.content,
        choices: q.choices as string[],
        level: q.level
    }));

    // Pass server action wrapper to client component
    async function submit(answers: Record<string, number>) {
        'use server';
        await submitAssessmentAction(params.token, answers);
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12">
            <AssessmentWizard
                token={params.token}
                questions={questions}
                targetLevel={session.targetLevel as string}
                onSubmit={submit}
            />
        </div>
    );
}
