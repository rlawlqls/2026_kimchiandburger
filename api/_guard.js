// Shared request guard for the serverless functions in api/.
// Both endpoints spend OUR Gemini quota, so an unauthenticated public proxy is a
// standing invitation to drain it. Two cheap defences, no external service:
//   1) origin allow-list (opt-in via ALLOWED_ORIGINS)
//   2) per-IP sliding-window rate limit, held in the warm instance's memory
//
// The rate limit is best-effort: Vercel may run several instances, so the real
// ceiling is (limit × instances). That still turns "unbounded" into "bounded",
// which is the point. Files prefixed with _ are not routed as endpoints.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12; // a human scanning a menu board never comes close

/** ip → array of request timestamps inside the current window */
const hits = new Map();

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Reject anything that isn't a same-site POST from an allowed origin, or that
 * exceeds the per-IP budget. Returns true when the request was answered (and the
 * caller must stop); false when it is cleared to proceed.
 */
export function blockRequest(req, res, { now = Date.now() } = {}) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return true;
  }

  // 1) Origin check — only enforced when ALLOWED_ORIGINS is configured, so local
  // development and `vercel dev` keep working without extra setup.
  const allow = allowedOrigins();
  if (allow.length) {
    const origin = req.headers.origin;
    // Same-origin fetches from some browsers omit Origin; fall back to Referer.
    const referer = typeof req.headers.referer === "string" ? req.headers.referer : "";
    const ok =
      (origin && allow.includes(origin)) || allow.some((o) => referer.startsWith(`${o}/`));
    if (!ok) {
      res.status(403).json({ error: "Origin not allowed" });
      return true;
    }
  }

  // 2) Per-IP sliding window.
  const ip = clientIp(req);
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    res.setHeader("Retry-After", Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
    res.status(429).json({ error: "Too many requests — slow down and try again." });
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long-lived warm instance.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return false;
}
