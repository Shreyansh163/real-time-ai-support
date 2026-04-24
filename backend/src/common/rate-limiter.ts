import { Injectable } from "@nestjs/common";

type Bucket = { tokens: number; resetAt: number };

@Injectable()
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  // Returns true when allowed. When blocked, returns retryAfter (ms).
  check(
    key: string,
    limit: number,
    windowMs: number,
  ): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }

    if (bucket.tokens <= 0) {
      return { ok: false, retryAfter: bucket.resetAt - now };
    }

    bucket.tokens -= 1;
    return { ok: true, retryAfter: 0 };
  }
}
