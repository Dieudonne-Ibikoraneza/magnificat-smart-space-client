/**
 * The idempotency key of a checkout. One key is minted per cart and re-sent on
 * every retry of that same cart — including after a page reload, so a checkout
 * whose reply never arrived can be retried safely: the server recognises the key
 * and hands back the order it already created instead of placing a second one.
 * The key is dropped once the checkout has an answer (an order, or a
 * negotiation), and a changed cart gets a fresh key: the key belongs to that
 * exact cart, never to "whatever the cart is now".
 */

const STORAGE_KEY = "mss.checkout.key.v1";

type StoredKey = { signature: string; key: string };

// Used if session storage is unavailable (private window, blocked site data).
let memory: StoredKey | null = null;

const newKey = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  // Older browsers: a v4 UUID from random bytes.
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};

const read = (): StoredKey | null => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredKey;
  } catch {
    // fall through to the in-memory copy
  }
  return memory;
};

const write = (value: StoredKey | null) => {
  memory = value;
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // memory copy above still works for this page
  }
};

/** Identifies a cart by what is in it — the same lines and quantities always give the same signature. */
export const checkoutSignature = (lines: readonly { productId: string; areaSqm: number }[]) =>
  lines
    .map((line) => `${line.productId}:${line.areaSqm}`)
    .sort()
    .join("|");

/** The key for this exact cart: the one already minted if there is one, otherwise a new one. */
export const checkoutKeyFor = (signature: string): string => {
  const stored = read();
  if (stored && stored.signature === signature) return stored.key;
  const fresh = { signature, key: newKey() };
  write(fresh);
  return fresh.key;
};

/** The checkout has an answer (or its key is unusable) — the next one starts with a new key. */
export const clearCheckoutKey = () => write(null);
