export type OrderDraft = {
  customerId: string | null;
  selectedProducts: Record<string, string>;
  step: number;
  maxReachedStep: number;
  savedAt: string;
};

/**
 * Saves an in-progress "New Order" wizard locally, so a staff member who
 * reloads (or comes back later) mid-draft picks up right where they left
 * off, instead of starting over. Guarded like every other localStorage
 * access in the app (see `api/client.ts`) — server rendering has no
 * `window`, and a browser with site data blocked throws on access; either
 * way the draft just doesn't survive a reload, a safe degradation rather
 * than a broken feature.
 */
export const readOrderDraft = (key: string): OrderDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
};

export const writeOrderDraft = (key: string, draft: OrderDraft) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage unavailable — the draft just won't survive a reload.
  }
};

/** Called once the order is actually created — nothing left to resume. */
export const clearOrderDraft = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do — if it couldn't be written, it wasn't persisted anyway.
  }
};
