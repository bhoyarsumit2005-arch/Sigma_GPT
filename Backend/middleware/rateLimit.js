import { rateLimit, ipKeyGenerator, MINUTE } from "express-rate-limit";

/**
 * Should X-Forwarded-For (set by a reverse proxy) be trusted when working out
 * who the client is?
 *
 *   TRUST_PROXY=1  always trust one proxy hop
 *   TRUST_PROXY=0  never trust it
 *   (unset)        trust it in production, ignore it anywhere else
 *
 * server.js reads `trustProxyEnabled` and applies it as `app.set("trust proxy", …)`.
 * It must never be set to `true`: that lets anyone spoof their own IP.
 */
const rawTrustProxy = process.env.TRUST_PROXY;

export const trustProxyEnabled =
    rawTrustProxy === undefined
        ? process.env.NODE_ENV === "production"
        : rawTrustProxy === "1" || rawTrustProxy.toLowerCase() === "true";

function intFromEnv(name, fallback) {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

//express-rate-limit answers with JSON by default only if you give it a handler;
//otherwise the frontend would receive an HTML error page it cannot parse
function jsonHandler(message) {
    return (req, res) => {
        res.status(429).json({ error: message });
    };
}

const sharedOptions = {
    standardHeaders: true, //RateLimit-* headers (draft-6) instead of the legacy X-RateLimit-*
    legacyHeaders: false,
    //when the proxy setting is off we deliberately ignore X-Forwarded-For, so the
    //library's "header present but trust proxy is false" warning is expected noise
    //and a spoofed header cannot flood the logs
    validate: { xForwardedForHeader: trustProxyEnabled },
};

//ceiling for every /api request: stops scraping and endpoint hammering
export const globalLimiter = rateLimit({
    windowMs: 15 * MINUTE,
    limit: intFromEnv("RATE_LIMIT_GLOBAL", 300),
    ...sharedOptions,
    handler: jsonHandler(
        "Too many requests. Please wait a few minutes and try again."
    ),
});

//brute-force protection for login/signup: keyed by IP because the account is
//not known yet at that point
export const authLimiter = rateLimit({
    windowMs: 15 * MINUTE,
    limit: intFromEnv("RATE_LIMIT_AUTH", 10),
    ...sharedOptions,
    handler: jsonHandler(
        "Too many sign-in attempts. Please wait a few minutes and try again."
    ),
});

//per-account budget for AI calls: one user hammering /api/chat cannot spend
//the quota of everybody else (requireAuth runs first, so req.user is set)
export const chatLimiter = rateLimit({
    windowMs: 1 * MINUTE,
    limit: intFromEnv("RATE_LIMIT_CHAT", 20),
    ...sharedOptions,
    handler: jsonHandler(
        "You are sending messages too quickly. Please slow down and try again."
    ),
    keyGenerator: (req) =>
        req.user?.id ? req.user.id : ipKeyGenerator(req.ip),
});
