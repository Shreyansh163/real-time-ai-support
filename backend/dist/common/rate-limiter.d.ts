export declare class RateLimiter {
    private buckets;
    check(key: string, limit: number, windowMs: number): {
        ok: boolean;
        retryAfter: number;
    };
}
