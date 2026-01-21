/**
 * Simple In-Memory Rate Limiter
 * For production, use Redis-based solution.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store: Map<string, RateLimitEntry> = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute per key

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // Start a new window
        store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetAt - now };
}

export function getRateLimitHeaders(remaining: number, resetIn: number): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000))
    };
}
