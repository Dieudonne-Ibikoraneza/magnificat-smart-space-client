/**
 * Security headers for every response.
 *
 * - The Content-Security-Policy is built per request (`buildContentSecurityPolicy`)
 *   because it carries a fresh nonce: only scripts that present that nonce, and
 *   scripts those load (`'strict-dynamic'`), may run — an injected `<script>` or
 *   an inline event handler is refused by the browser, which is what limits the
 *   damage of an XSS bug elsewhere in the app.
 * - The rest (`STATIC_SECURITY_HEADERS`) don't change per request and are also
 *   applied by `next.config.ts`, so static assets get them too.
 */

/** The API's origin — the only other place the app talks to (fetch + WebSocket). */
const apiOrigin = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:4000";
  }
};

const websocketOrigin = (origin: string): string => origin.replace(/^http/, "ws");

export const buildContentSecurityPolicy = (nonce: string): string => {
  const isDev = process.env.NODE_ENV !== "production";
  const api = apiOrigin();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // `strict-dynamic` lets the nonce'd bootstrap script load the rest of the
    // app's chunks; dev additionally needs eval for React's refresh tooling.
    // `wasm-unsafe-eval` only permits compiling WebAssembly (the 3D visualizer's
    // decoders) — it does not allow `eval()` or string-built code.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'wasm-unsafe-eval'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Tailwind/Next inject inline styles; styles can't run code, so this is the
    // lesser exception.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Product and collection photos come from the storage provider's signed URLs
    // (any https host), plus data:/blob: for generated and uploaded previews.
    "img-src": ["'self'", "data:", "blob:", "https:", ...(isDev ? ["http:"] : [])],
    "font-src": ["'self'", "data:"],
    // The API (fetch + WebSocket), plus blob:/data: for assets the 3D scene loads
    // from memory.
    "connect-src": [
      "'self'",
      api,
      websocketOrigin(api),
      "blob:",
      "data:",
      ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : []),
    ],
    "media-src": ["'self'", "blob:", "data:", "https:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Nobody may embed the app in a frame (clickjacking).
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Only for a deployment served over https (its API is too) — on plain http,
  // e.g. `next start` on a laptop, upgrading every request would break the app.
  if (!isDev && api.startsWith("https://")) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
};

export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Only meaningful over https; browsers ignore it on plain http (local dev).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
