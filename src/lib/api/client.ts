import type { ApiEnvelope } from "./types";

/**
 * Thin typed wrapper around `fetch` for the NestJS API.
 *
 * Three things it takes care of so callers don't have to:
 *  - unwrapping the server's `{ success, data }` envelope,
 *  - attaching the bearer token, and refreshing it once on a 401 before retrying,
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

// --- Token storage ----------------------------------------------------------

const ACCESS_TOKEN_KEY = "mss.accessToken";
const REFRESH_TOKEN_KEY = "mss.refreshToken";

/**
 * Tokens live in localStorage because the API is a separate origin issuing
 * bearer tokens rather than cookies. Every access is guarded: server rendering
 * has no `window`, and a browser with site data blocked throws on access.
 */
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
    // Storage unavailable (private window, blocked site data) — the session
    // simply won't survive a reload.
  }
};

export const tokenStore = {
  getAccessToken: () => readStorage(ACCESS_TOKEN_KEY),
  getRefreshToken: () => readStorage(REFRESH_TOKEN_KEY),
  set: (tokens: { accessToken: string; refreshToken: string }) => {
    writeStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
    writeStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear: () => {
    writeStorage(ACCESS_TOKEN_KEY, null);
    writeStorage(REFRESH_TOKEN_KEY, null);
  },
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
  /** Skip the Authorization header even when a token is stored. */
  anonymous?: boolean;
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

/**
 * A single in-flight refresh shared by every caller, so a burst of parallel
 * requests hitting 401 at once produces one refresh rather than a stampede
 * (which would also rotate the refresh token out from under each other).
 */
let refreshInFlight: Promise<boolean> | null = null;

const refreshTokens = async (): Promise<boolean> => {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStore.clear();
    return false;
  }

  const body = (await parseBody(response)) as ApiEnvelope<{
    accessToken: string;
    refreshToken: string;
  }>;
  if (!body?.data?.accessToken) {
    tokenStore.clear();
    return false;
  }

  tokenStore.set(body.data);
  return true;
};

export const ensureRefreshed = () => {
  refreshInFlight ??= refreshTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
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
    signal: options.signal,
  });
};

/**
 * Performs a request and returns the unwrapped `data` payload.
 * Throws `ApiError` on any non-2xx response.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response: Response;
  try {
    response = await send(path, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  // One retry after a refresh; the retry itself never refreshes again.
  if (response.status === 401 && !options.anonymous && tokenStore.getRefreshToken()) {
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

  if (response.status === 401 && tokenStore.getRefreshToken()) {
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
  let response = await send(path, {});

  if (response.status === 401 && tokenStore.getRefreshToken()) {
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
