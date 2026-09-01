const STORAGE_KEY = "mss.session-id";

/**
 * A stable per-browser id for anonymous-safe interaction tracking
 * (`POST /events/tile`, `POST /events/journey`) — generated once and reused
 * on later visits, independent of login. Guarded like every other
 * localStorage access in the app (see `api/client.ts`): server rendering
 * has no `window`, and a browser with site data blocked throws on access;
 * either way this still returns a usable (if not persisted) id.
 */
export const getSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return "anonymous";
  }
};
