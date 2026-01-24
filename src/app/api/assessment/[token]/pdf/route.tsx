
import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { AssessmentCertificate } from '@/components/pdf/AssessmentCertificate';
import { getAssessmentSessionAction } from '@/application/actions/assessment.actions';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> } // Params is a promise in Next 15/latest
) {
    const { token } = await params;

    // 1. Fetch Session Data
    const res = await getAssessmentSessionAction(token);

    if (!res.success || !res.data) {
        return new NextResponse('Certificate not found', { status: 404 });
    }

    const { session } = res.data;

    // 2. Prepare Data
    const data = {
        candidateName: session.leadName || 'Inconnu',
        date: session.completedAt ? new Date(session.completedAt).toLocaleDateString() : new Date().toLocaleDateString(),
        level: session.calculatedLevel || 'N/A',
        score: session.score || 0,
        recommendation: session.recommendation || 'Parcours sur mesure',
        token: session.token
    };

    // 3. Render PDF Stream
    const stream = await renderToStream(<AssessmentCertificate {...data} />);

    // 4. Return as PDF
    return new NextResponse(stream as any, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Attestation_${session.leadName.replace(/\s+/g, '_')}.pdf"`
        }
    });
}
