"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const common_1 = require("@nestjs/common");
let RateLimiter = class RateLimiter {
    constructor() {
        this.buckets = new Map();
    }
    check(key, limit, windowMs) {
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
};
exports.RateLimiter = RateLimiter;
exports.RateLimiter = RateLimiter = __decorate([
    (0, common_1.Injectable)()
], RateLimiter);
//# sourceMappingURL=rate-limiter.js.map