"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@/components/product-card";
import { toast } from "@/components/ui/toast";
import { cartApi, tokenStore } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { toProduct } from "@/lib/api/mappers";
import { useLocale } from "@/lib/i18n";
import { calculateTileQuantity, type TileQuantity } from "@/lib/tile-calculator";

export type CartLine = {
  productId: string;
  areaSqm: number;
  product: Product;
  quantity: TileQuantity;
  totalPrice: number;
  /**
   * Whether *this line's actual quantity* exceeds stock — decided by the
   * server (`cart.service.ts`), because the exact available area is staff-only
   * and never sent to the customer. It follows an edit a moment after the
   * debounced save lands (`syncFlags`); until then the previous verdict stays.
   * `undefined` for a line the server hasn't judged yet (just added) — no
   * shortage shown rather than a wrong one.
   */
  exceedsStock: boolean | undefined;
};

type CartState = {
  lines: CartLine[];
  count: number;
  total: number;
  /** True only until the very first read (cache or server) has landed. */
  loading: boolean;
  /** Sets a line to exactly `areaSqm` — adds it if it isn't in the cart yet. Instant locally; syncs to the server debounced in the background. */
  setQuantity: (product: Product, areaSqm: number) => void;
  removeItem: (productId: string) => void;
  /** Empties the cart, on the server too — for "Clear Cart" and right after an order is placed. */
  clear: () => void;
  /** Drops the local view only, no server call — for logout, so the next visitor on this device doesn't see it. */
  reset: () => void;
  /** Forces a fresh read from the server — e.g. right after login. */
  refresh: () => void;
};

const CartContext = createContext<CartState | null>(null);

const STORAGE_KEY = "mss.cart.v1";
const SYNC_DEBOUNCE_MS = 500;

const buildLine = (product: Product, areaSqm: number, exceedsStock?: boolean): CartLine => {
  const quantity = calculateTileQuantity(areaSqm, product);
  // Priced by area, not by the box: `product.price` is per m², and the
  // total is billed on `purchasedArea` — the actual area shipped once
  // rounded up to whole pieces — mirroring the server (`cart.service.ts`).
  return {
    productId: product.id,
    areaSqm,
    product,
    quantity,
    totalPrice: quantity.purchasedArea * product.price,
    exceedsStock,
  };
};

type CachedLine = { productId: string; areaSqm: number; product: Product; exceedsStock?: boolean };

const readCache = (): CartLine[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedLine[];
    return parsed.map((entry) => buildLine(entry.product, entry.areaSqm, entry.exceedsStock));
  } catch {
    return [];
  }
};

const writeCache = (lines: CartLine[]) => {
  try {
    const cached: CachedLine[] = lines.map((line) => ({
      productId: line.productId,
      areaSqm: line.areaSqm,
      product: line.product,
      exceedsStock: line.exceedsStock,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Storage unavailable (private window, blocked site data) — the cart
    // still works for this visit, it just won't survive a reload.
  }
};

/**
 * The cart is local-first: every edit updates state (and localStorage)
 * immediately and is reflected on screen with no network wait — no spinner,
 * no full-page reload feel for something as small as a quantity nudge. The
 * server write happens in the background, debounced, and the server
 * remains the actual source of truth: every fresh mount re-fetches it and
 * replaces whatever's local, which also self-heals from a background save
 * that failed earlier (a dropped connection, say) instead of leaving the
 * cart permanently out of sync with what's actually stored.
 *
 * Every server write goes through ONE ordered queue (`enqueue`): a save that
 * is already in flight can't land after a later clear/remove and bring the
 * item back, because the clear only starts once that save has finished. A write
 * that fails is reported once and the cart is re-read, so the screen shows what
 * the server really holds instead of silently drifting from it.
 */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const syncTimers = useRef<Record<string, number>>({});
  // Read inside `setQuantity` without making it depend on (and get
  // re-memoized every time) `lines` itself.
  const linesRef = useRef<CartLine[]>(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  // Server writes run strictly one after another, in the order they were made.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);
  /** Bumps on every local cart change and on sign-out — a read that started before one is stale. */
  const epochRef = useRef(0);
  /** Bumps on sign-out: writes queued for the previous session are dropped, not sent. */
  const sessionRef = useRef(0);
  /** Set when a write failed, or a read had to be skipped: re-read the cart once the queue drains. */
  const reconcileRef = useRef(false);
  const failureShownRef = useRef(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      // The access token only exists again once the session cookie has been
      // exchanged after a page load — deciding "signed out" before that would
      // also wipe the cached copy below.
      await tokenStore.ready();
      if (!active) return;
      if (!tokenStore.getAccessToken()) {
        if (active) {
          setLines([]);
          writeCache([]);
          setLoading(false);
        }
        return;
      }

      // Instant paint from whatever was cached last session, before the
      // server round trip below even starts. Deliberately not read during
      // the initial render itself (that would desync client/server markup);
      // this async task is the earliest point that's still hydration-safe.
      const cached = readCache();
      if (cached.length > 0 && active) setLines(cached);

      try {
        const startEpoch = epochRef.current;
        const cart = await cartApi.view();
        if (!active) return;
        // Changed locally (or signed out) while this read was in flight, or
        // writes are still on their way: this answer describes the past, and
        // applying it would bring back what was just cleared. Look again once
        // the queue has drained instead.
        if (epochRef.current !== startEpoch || pendingRef.current > 0) {
          if (pendingRef.current > 0) reconcileRef.current = true;
          return;
        }
        const nextLines = cart.items
          .filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => !!item.product)
          .map((item) => buildLine(toProduct(item.product, undefined, locale), Number(item.areaSqm), item.exceedsStock));
        setLines(nextLines);
        writeCache(nextLines);
      } catch {
        // A failed background read isn't worth an error screen over — the
        // visitor still has whatever was cached (or an empty cart).
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
    // Re-fetching (not just re-rendering) on a locale switch is the simplest
    // correct way to re-localize already-loaded lines — the raw `ApiProduct`
    // behind each `CartLine` isn't kept around once `toProduct` picks a
    // language, so there's nothing cheaper to re-derive from locally.
  }, [generation, locale]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  /**
   * Re-reads the cart and takes only the server's `exceedsStock` verdicts —
   * quantities stay as they are locally, so an edit made while this was in
   * flight isn't overwritten. A verdict for a quantity that has since changed
   * again is skipped; that later edit's own sync will refresh it.
   */
  const syncFlags = useCallback(() => {
    cartApi
      .view()
      .then((cart) => {
        setLines((current) => {
          const next = current.map((line) => {
            const server = cart.items.find((item) => item.productId === line.productId);
            return server && Number(server.areaSqm) === line.areaSqm
              ? { ...line, exceedsStock: server.exceedsStock }
              : line;
          });
          writeCache(next);
          return next;
        });
      })
      .catch(() => {
        // Keep whatever verdict is showing — the next sync or mount retries.
      });
  }, []);

  /**
   * Runs a server write after every earlier one has finished. A failure is
   * shown once per burst (not once per retry) and makes the cart re-read from
   * the server when the queue is empty, so the screen ends up showing what is
   * really saved.
   */
  const enqueue = useCallback(
    (label: string, write: () => Promise<unknown>) => {
      const session = sessionRef.current;
      pendingRef.current += 1;
      queueRef.current = queueRef.current.then(async () => {
        try {
          if (session === sessionRef.current) {
            await write();
            failureShownRef.current = false;
          }
        } catch (cause) {
          console.error(`Cart sync (${label}) failed:`, cause);
          reconcileRef.current = true;
          if (!failureShownRef.current) {
            failureShownRef.current = true;
            toast.error(t("dash.cart.toastSyncFailedTitle"), { description: t("dash.cart.toastSyncFailedBody") });
          }
        } finally {
          pendingRef.current -= 1;
          if (pendingRef.current === 0 && reconcileRef.current) {
            reconcileRef.current = false;
            refresh();
          }
        }
      });
    },
    [refresh, t],
  );

  const syncUpsert = useCallback(
    (productId: string, areaSqm: number, onSynced?: () => void) => {
      if (syncTimers.current[productId]) window.clearTimeout(syncTimers.current[productId]);
      syncTimers.current[productId] = window.setTimeout(() => {
        delete syncTimers.current[productId];
        enqueue("upsert", async () => {
          await cartApi.upsertItem(productId, areaSqm);
          onSynced?.();
        });
      }, SYNC_DEBOUNCE_MS);
    },
    [enqueue],
  );

  const setQuantity = useCallback(
    (product: Product, areaSqm: number) => {
      epochRef.current += 1;
      const clamped = Math.round(Math.max(0.01, areaSqm) * 100) / 100;
      setLines((current) => {
        const existing = current.find((line) => line.productId === product.id);
        // Keeps the verdict the server last gave for this line until the
        // debounced save below lands and `syncFlags` replaces it.
        const line = buildLine(product, clamped, existing?.exceedsStock);
        const next = existing
          ? current.map((entry) => (entry.productId === product.id ? line : entry))
          : [...current, line];
        writeCache(next);
        return next;
      });
      // Whether the quantity fits stock is the server's call (the exact
      // available area is staff-only) — ask again once the save has landed.
      syncUpsert(product.id, clamped, syncFlags);
    },
    [syncUpsert, syncFlags],
  );

  const removeItem = useCallback(
    (productId: string) => {
      epochRef.current += 1;
      // A save still waiting out its debounce is dropped; one already sent is
      // finished first (the queue), so it can't re-add the line afterwards.
      if (syncTimers.current[productId]) window.clearTimeout(syncTimers.current[productId]);
      delete syncTimers.current[productId];
      setLines((current) => {
        const next = current.filter((line) => line.productId !== productId);
        writeCache(next);
        return next;
      });
      enqueue("remove", async () => {
        try {
          await cartApi.removeItem(productId);
        } catch (cause) {
          // Never saved in the first place (added and removed within the
          // debounce) — already as removed as it can be.
          if (!(cause instanceof ApiError && cause.status === 404)) throw cause;
        }
      });
    },
    [enqueue],
  );

  const clear = useCallback(() => {
    epochRef.current += 1;
    Object.values(syncTimers.current).forEach((timer) => window.clearTimeout(timer));
    syncTimers.current = {};
    setLines([]);
    writeCache([]);
    enqueue("clear", () => cartApi.clear());
  }, [enqueue]);

  const reset = useCallback(() => {
    epochRef.current += 1;
    sessionRef.current += 1;
    reconcileRef.current = false;
    Object.values(syncTimers.current).forEach((timer) => window.clearTimeout(timer));
    syncTimers.current = {};
    setLines([]);
    writeCache([]);
  }, []);

  const count = lines.length;
  const total = lines.reduce((sum, line) => sum + line.totalPrice, 0);

  return (
    <CartContext.Provider value={{ lines, count, total, loading, setQuantity, removeItem, clear, reset, refresh }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
};
