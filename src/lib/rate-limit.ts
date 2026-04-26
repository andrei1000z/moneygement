import "server-only";

// Rate limiter în-memorie (per-process). Pentru un PWA cu 2 useri și
// instanțe Vercel multiple, e suficient ca primul gard împotriva spike-urilor
// accidentale. Înlocuiește cu Upstash Ratelimit dacă nevoia apare.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true; remaining: number } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count };
}
