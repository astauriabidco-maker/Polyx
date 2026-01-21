import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleCalendarService } from '@/application/services/google-calendar.service';
import { encrypt } from '@/lib/crypto';

/**
 * Google OAuth Callback Handler
 * This route receives the authorization code from Google after user consent
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // orgId or user:userId
    const error = searchParams.get('error');

    // Construct the redirect URI (same as used in auth request)
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Handle errors from Google
    if (error) {
        console.error('[GoogleOAuth] Error from Google:', error);
        return NextResponse.redirect(
            `${baseUrl}/app/settings/integrations?error=${encodeURIComponent(error)}`
        );
    }

    // Validate required parameters
    if (!code || !state) {
        console.error('[GoogleOAuth] Missing code or state');
        return NextResponse.redirect(
            `${baseUrl}/app/settings/integrations?error=missing_params`
        );
    }

    const isUserFlow = state.startsWith('user:');
    const targetId = isUserFlow ? state.split(':')[1] : state;

    try {
        // Exchange authorization code for tokens
        const tokens = await GoogleCalendarService.exchangeCodeForTokens(code, redirectUri);

        console.log('[GoogleOAuth] Tokens received for:', tokens.email);

        if (isUserFlow) {
            // Save to User model
            await (prisma as any).user.update({
                where: { id: targetId },
                data: {
                    googleRefreshToken: tokens.refreshToken // Refresh token is what we need for long term sync
                }
            });
            console.log('[GoogleOAuth] User Calendar linked successfully');
            return NextResponse.redirect(`${baseUrl}/app/agenda?google_connected=true`);
        } else {
            // Get list of calendars to select primary
            const calendars = await GoogleCalendarService.listCalendars(tokens.accessToken);
            const primaryCalendar = calendars.find(c => c.primary) || calendars[0];

            // Save tokens to database (encrypted) for Organisation
            await (prisma as any).integrationConfig.upsert({
                where: { organisationId: targetId },
                create: {
                    organisationId: targetId,
                    googleCalendarEnabled: true,
                    googleAccessToken: encrypt(tokens.accessToken),
                    googleRefreshToken: encrypt(tokens.refreshToken),
                    googleTokenExpiry: tokens.expiresAt,
                    googleConnectedEmail: tokens.email,
                    googleCalendarId: primaryCalendar?.id || 'primary',
                    googleLastSyncAt: new Date(),
                    googleSyncStatus: 'success'
                },
                update: {
                    googleCalendarEnabled: true,
                    googleAccessToken: encrypt(tokens.accessToken),
                    googleRefreshToken: encrypt(tokens.refreshToken),
                    googleTokenExpiry: tokens.expiresAt,
                    googleConnectedEmail: tokens.email,
                    googleCalendarId: primaryCalendar?.id || 'primary',
                    googleLastSyncAt: new Date(),
                    googleSyncStatus: 'success'
                }
            });
            console.log('[GoogleOAuth] Organisation Configuration saved successfully');
            return NextResponse.redirect(`${baseUrl}/app/settings/integrations?google_connected=true`);
        }

    } catch (err: any) {
        console.error('[GoogleOAuth] Error:', err);

        if (!isUserFlow) {
            // Update status to failed for org
            try {
                await (prisma as any).integrationConfig.update({
                    where: { organisationId: targetId },
                    data: {
                        googleSyncStatus: 'failed',
                        googleCalendarEnabled: false
                    }
                });
            } catch { }
        }

        const redirectPath = isUserFlow ? '/app/agenda' : '/app/settings/integrations';
        return NextResponse.redirect(
            `${baseUrl}${redirectPath}?error=${encodeURIComponent(err.message || 'oauth_failed')}`
        );
    }
}
