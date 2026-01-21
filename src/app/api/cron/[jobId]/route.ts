import { NextRequest, NextResponse } from 'next/server';
import { runScheduledJobAction } from '@/application/actions/scheduler.actions';

/**
 * CRON API Endpoint for automated job execution
 * 
 * Usage: POST /api/cron/[jobId]
 * Headers: Authorization: Bearer <CRON_SECRET>
 * 
 * This endpoint is designed to be called by external schedulers like:
 * - Vercel Cron
 * - GitHub Actions
 * - Trigger.dev
 * - AWS EventBridge
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    // Validate CRON secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log(`[CRON API] ❌ Unauthorized attempt for job: ${jobId}`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organisation ID from query params or use default
    const { searchParams } = new URL(request.url);
    const organisationId = searchParams.get('orgId') || process.env.DEFAULT_ORG_ID || '';

    if (!organisationId) {
        return NextResponse.json({ error: 'Organisation ID required' }, { status: 400 });
    }

    console.log(`[CRON API] ▶️ External trigger for job: ${jobId}`);

    try {
        const result = await runScheduledJobAction(jobId, organisationId);

        if (result.success) {
            console.log(`[CRON API] ✅ Job ${jobId} completed successfully`);
            return NextResponse.json({
                success: true,
                job: jobId,
                result: result.result,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`[CRON API] ❌ Job ${jobId} failed:`, result.error);
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }
    } catch (error) {
        console.error(`[CRON API] ❌ Unexpected error for job ${jobId}:`, error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Also support GET for simple health checks
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    return NextResponse.json({
        job: jobId,
        status: 'ready',
        message: 'Use POST to execute this job',
        timestamp: new Date().toISOString()
    });
}
