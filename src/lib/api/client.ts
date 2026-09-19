import type { ApiEnvelope } from "./types";

/**
 * Thin typed wrapper around `fetch` for the NestJS API.
 *
 * Three things it takes care of so callers don't have to:
 *  - unwrapping the server's `{ success, data }` envelope,
 *  - attaching the bearer token (held in memory only — see "Session" below),
 *    and refreshing it once on a 401 before retrying,
 *  - turning error responses into a single `ApiError` with the server's message.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

// --- Session ----------------------------------------------------------------

/**
 * How a signed-in session is held, so that nothing an XSS could read is worth
 * stealing:
 *  - The long-lived REFRESH token lives only in an `HttpOnly` cookie set by the
 *    API. Page script can't read it; the browser attaches it to the auth
 *    endpoints alone (`credentials: "include"` below), and the server rotates it.
 *  - The short-lived ACCESS token lives only in this module's memory. A reload
 *    forgets it, and it's silently re-issued from the cookie (`restoreSession`).
 *  - `localStorage` holds just a non-secret "this browser has a session" hint,
 *    so an anonymous visitor's page loads don't each probe the refresh endpoint.
 *    Its value is a random id minted at every sign-in (never on a token
 *    refresh), so a sign-in — even as a different account — is a change that
 *    every other tab gets a `storage` event for.
 */
const SESSION_HINT_KEY = "mss.session";
/** What older builds stored — read once to carry a signed-in user over to the cookie, then deleted. */
const LEGACY_ACCESS_TOKEN_KEY = "mss.accessToken";
const LEGACY_REFRESH_TOKEN_KEY = "mss.refreshToken";

const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private window, blocked site data) — the hint is
    // only an optimisation, so the session still works; it just won't be
    // restored after a reload.
  }
};

/**
 * Fired whenever the signed-in state changes underneath the app: the refresh
 * cookie was rejected (session truly over, not just an access token due for a
 * silent refresh), or another tab signed in/out.
 * `CurrentUserProvider` listens for this to re-check "who is this?", which is
 * what lets `useRequireRole` notice and bounce to `/auth` — without this, a
 * session dying in the background (e.g. mid-conversation in the chatbot) left
 * every API call throwing "Unauthorized" with no way back to sign-in short of
 * a manual reload.
 */
export const SESSION_CHANGED_EVENT = "mss:session-changed";

const emitSessionChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
};

/** `unknown` until the first request decides whether there is a session to restore. */
type SessionState = "unknown" | "active" | "none";

let accessToken: string | null = null;
let sessionState: SessionState = "unknown";

/** A fresh, meaningless id for one sign-in; only its changing matters. */
const newSessionId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const tokenStore = {
  getAccessToken: () => accessToken,
  /** `unknown` after a restore that couldn't reach the API — the session is unconfirmed, not gone. */
  getState: (): SessionState => sessionState,
  /**
   * Store the access token from a login/refresh. (The refresh token never
   * comes through here — it's a cookie.) Pass `signIn` for a real sign-in: it
   * rewrites the hint with a new id so other tabs notice, whereas a refresh
   * leaves the hint alone — rewriting it there would make every tab think the
   * account changed each time a token expires.
   */
  set: (tokens: { accessToken: string }, { signIn = false }: { signIn?: boolean } = {}) => {
    accessToken = tokens.accessToken;
    sessionState = "active";
    if (signIn || readStorage(SESSION_HINT_KEY) === null) writeStorage(SESSION_HINT_KEY, newSessionId());
  },
  /** Forget the session locally (the server-side revoke + cookie clear is `authApi.logout`). */
  clear: () => {
    accessToken = null;
    sessionState = "none";
    writeStorage(SESSION_HINT_KEY, null);
  },
  /**
   * Resolves once the session has been restored (or found not to exist) after
   * a page load. Anything that decides "signed in or not" at mount — the
   * user/cart/favorites providers — must wait for this first: right after a
   * reload the in-memory access token is gone until the cookie has been
   * exchanged for a new one.
   */
  ready: (): Promise<void> => restoreSession(),
};

// --- Request plumbing -------------------------------------------------------

export type QueryValue = string | number | boolean | null | undefined;

export const buildQuery = (params?: Record<string, QueryValue>): string => {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Skip the Authorization header even when a token is held. */
  anonymous?: boolean;
  /** `"include"` for the endpoints that send/receive the refresh cookie (the API is a separate origin). */
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const errorMessageOf = (body: unknown, fallback: string): string => {
  if (typeof body === "string" && body) return body;
  if (body && typeof body === "object") {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
    // class-validator returns an array of messages for a failed DTO.
    if (Array.isArray(message) && message.length > 0) return message.join(" ");
  }
  return fallback;
};

type RefreshOutcome = "ok" | "rejected" | "unreachable";

/**
 * Serialises refreshes across every tab of this browser. The refresh cookie
 * rotates on each use, so two tabs refreshing at once could each present the
 * same cookie and one would lose — a Web Lock makes the second tab wait and
 * then send the cookie the first one just received.
 */
const withRefreshLock = async <T>(task: () => Promise<T>): Promise<T> =>
  typeof navigator !== "undefined" && navigator.locks
    ? await navigator.locks.request("mss-refresh-session", task)
    : task();

/**
 * Exchanges the refresh cookie for a new access token. `legacyRefreshToken`
 * is only passed once, to migrate a session an older build kept in
 * localStorage into the cookie.
 *
 * Only a 401 means the session is over; a network failure or a server hiccup
 * says nothing about it, so those leave the session (and the hint) alone.
 */
const exchangeRefreshCookie = (legacyRefreshToken?: string): Promise<RefreshOutcome> =>
  withRefreshLock(async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {}),
      });
    } catch {
      return "unreachable";
    }

    if (response.status === 401) return "rejected";
    if (!response.ok) return "unreachable";

    const body = (await parseBody(response)) as ApiEnvelope<{ accessToken: string }> | undefined;
    if (!body?.data?.accessToken) return "unreachable";

    tokenStore.set({ accessToken: body.data.accessToken });
    return "ok";
  });

/** The session is definitively over: forget it here and tell the app. */
const endSession = (notify: boolean) => {
  tokenStore.clear();
  if (notify) emitSessionChanged();
};

/**
 * A single in-flight refresh shared by every caller in this tab, so a burst of
 * parallel requests hitting 401 at once produces one refresh rather than a
 * stampede.
 */
let refreshInFlight: Promise<boolean> | null = null;

export const ensureRefreshed = (): Promise<boolean> => {
  refreshInFlight ??= exchangeRefreshCookie()
    .then((outcome) => {
      if (outcome === "rejected") endSession(true);
      return outcome === "ok";
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

/**
 * First use after a page load: decide whether there's a session to bring back
 * and, if so, get a fresh access token for it. Runs at most once per page
 * (until another tab signs in). An anonymous visitor — no hint, no legacy
 * tokens — skips the network entirely.
 */
let restoreInFlight: Promise<void> | null = null;

function restoreSession(): Promise<void> {
  restoreInFlight ??= (async () => {
    if (sessionState !== "unknown") return;

    const legacyRefreshToken = readStorage(LEGACY_REFRESH_TOKEN_KEY);
    if (!legacyRefreshToken && readStorage(SESSION_HINT_KEY) === null) {
      sessionState = "none";
      return;
    }

    const outcome = await exchangeRefreshCookie(legacyRefreshToken ?? undefined);
    // A definitive answer either way retires the old storage; a network
    // failure keeps it so the migration can be retried on the next load.
    if (outcome !== "unreachable") {
      writeStorage(LEGACY_ACCESS_TOKEN_KEY, null);
      writeStorage(LEGACY_REFRESH_TOKEN_KEY, null);
    }
    if (outcome === "rejected") {
      endSession(false);
    } else if (outcome === "unreachable") {
      // Says nothing about the session: keep the hint and let the next request
      // try again, rather than treating a network blip as being signed out.
      sessionState = "unknown";
      restoreInFlight = null;
    }
  })();
  return restoreInFlight;
}

// Another tab signed in or out: the hint is the one thing they share.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SESSION_HINT_KEY) return;
    if (event.newValue === null) {
      // Signed out elsewhere — drop the token held in this tab too.
      if (accessToken) {
        accessToken = null;
        sessionState = "none";
        emitSessionChanged();
      }
    } else if (!accessToken) {
      // Signed in elsewhere — pick that session up.
      sessionState = "unknown";
      restoreInFlight = null;
      void restoreSession().then(emitSessionChanged);
    } else if (event.newValue !== event.oldValue) {
      // Someone signed in elsewhere while this tab is signed in — quite
      // possibly as a different account, since the cookie is shared by every
      // tab. Anything on screen (the page's data, the cart, favorites, the open
      // socket) belongs to the previous account, and there's no telling which
      // of it, so start over from the cookie. Dropping the token first keeps
      // this tab from making one more request as the old account meanwhile.
      accessToken = null;
      sessionState = "none";
      window.location.reload();
    }
  });
}

/** Reads a JWT's `exp` (ms since epoch) without verifying it — purely to
 * decide locally whether the token is still worth sending. Returns null for
 * anything that isn't a JWT with a numeric `exp`. */
const readJwtExpiryMs = (token: string): number | null => {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: unknown;
    };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};

/** Small margin so a token about to expire mid-flight is treated as already expired. */
const TOKEN_EXPIRY_SKEW_MS = 10_000;

/**
 * Makes sure the access token about to be sent is usable: restores the
 * session first if this is the first request after a page load, and
 * refreshes a token that's expired (or within `TOKEN_EXPIRY_SKEW_MS` of it)
 * *before* the request goes out. The 401 retry below only covers endpoints
 * that actually reject a stale token — public ones (`GET /products`,
 * `/collections`, …) answer it with the anonymous view instead, so a staff
 * page waiting on a 401 to trigger the refresh would silently render the
 * public shape of its data (e.g. stock quantities missing, shown as 0) until
 * the next reload.
 */
const ensureFreshAccessToken = async (): Promise<void> => {
  await restoreSession();
  if (!accessToken) return;
  const expiryMs = readJwtExpiryMs(accessToken);
  if (expiryMs === null || Date.now() < expiryMs - TOKEN_EXPIRY_SKEW_MS) return;
  await ensureRefreshed();
};

/** A current access token, for callers outside the request helpers (the negotiations websocket handshake). */
export const getFreshAccessToken = async (): Promise<string | null> => {
  await ensureFreshAccessToken();
  return accessToken;
};

const send = async (path: string, options: RequestOptions): Promise<Response> => {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (!options.anonymous) {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${API_BASE_URL}${path}${buildQuery(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: options.credentials,
    signal: options.signal,
  });
};

/**
 * Performs a request and returns the unwrapped `data` payload.
 * Throws `ApiError` on any non-2xx response.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  if (!options.anonymous) await ensureFreshAccessToken();

  let response: Response;
  try {
    response = await send(path, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  // One retry after a refresh; the retry itself never refreshes again.
  if (response.status === 401 && !options.anonymous && sessionState === "active") {
    const refreshed = await ensureRefreshed();
    if (refreshed) response = await send(path, options);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, errorMessageOf(body, response.statusText), body);
  }

  return (body as ApiEnvelope<T> | undefined)?.data as T;
};

/**
 * For the one endpoint that takes a file rather than JSON (the product image
 * upload) — same auth/refresh/envelope handling as `apiRequest`, but sends a
 * `FormData` body with no `Content-Type` set, so the browser fills in the
 * multipart boundary itself (setting it manually strips the boundary and the
 * server can't parse the body at all).
 */
export const apiUpload = async <T>(path: string, formData: FormData): Promise<T> => {
  await ensureFreshAccessToken();

  const sendForm = () => {
    const headers: Record<string, string> = {};
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData });
  };

  let response: Response;
  try {
    response = await sendForm();
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 401 && sessionState === "active") {
    const refreshed = await ensureRefreshed();
    if (refreshed) response = await sendForm();
  }

  const body = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, errorMessageOf(body, response.statusText), body);
  }
  return (body as ApiEnvelope<T> | undefined)?.data as T;
};

/**
 * For the handful of endpoints that answer with a raw file instead of the
 * usual `{ success, data }` envelope (the quotation PDF) — same auth/refresh
 * handling as `apiRequest`, but resolves to a `Blob` rather than parsed JSON.
 */
export const fetchBlob = async (path: string): Promise<Blob> => {
  await ensureFreshAccessToken();

  let response = await send(path, {});

  if (response.status === 401 && sessionState === "active") {
    const refreshed = await ensureRefreshed();
    if (refreshed) response = await send(path, {});
  }

  if (!response.ok) {
    const body = await parseBody(response);
    throw new ApiError(response.status, errorMessageOf(body, response.statusText), body);
  }

  return response.blob();
};

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
