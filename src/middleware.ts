import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Tenant Resolution (Subdomain or Path?)
    // We assume path-based architecture for this starter: /app/:orgId/...

    const path = request.nextUrl.pathname;

    // Public routes (Webhooks, Login, Landing)
    if (path.startsWith('/api/webhooks') || path === '/login' || path === '/') {
        return NextResponse.next();
    }

    // Authentication Check (Simulated)
    // In a real app, verify JWT or Session Cookie
    const token = request.cookies.get('auth_token');

    // If trying to access app routes without token
    if (!token && path.startsWith('/app')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // Tenant Isolation Logic
    // If the user is authenticated, we should ensure they are accessing their own organization
    // This usually requires decoding the token to get the user's orgId and matching it with the path

    const response = NextResponse.next();
    // response.headers.set('x-framework', 'polyx-core');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
