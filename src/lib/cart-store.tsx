"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Product } from "@/components/product-card";
import { cartApi, tokenStore } from "@/lib/api";
import { toProduct } from "@/lib/api/mappers";
import { calculateTileQuantity, type TileQuantity } from "@/lib/tile-calculator";

export type CartLine = {
  productId: string;
  areaSqm: number;
  product: Product;
  quantity: TileQuantity;
  totalPrice: number;
  /**
   * Whether *this line's actual quantity* exceeds stock — tracks `areaSqm`
   * live, unlike `product.stockStatus` (a fixed badge on the product itself,
   * true or not regardless of how much of it is in this line). `undefined`
   * when `product.availableAreaSqm` isn't known yet (a line just added,
   * before the next cart sync fills it in) — no shortage shown rather than a
   * wrong one.
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

const buildLine = (product: Product, areaSqm: number): CartLine => {
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
    // Recomputed from the live `areaSqm` every time, so raising or lowering
    // the quantity updates this instantly, client-side — no round trip, and
    // no stale flag left over from whatever it was requested at before.
    exceedsStock:
      product.availableAreaSqm === undefined
        ? undefined
        : quantity.purchasedArea > product.availableAreaSqm,
  };
};

type CachedLine = { productId: string; areaSqm: number; product: Product };

const readCache = (): CartLine[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedLine[];
    return parsed.map((entry) => buildLine(entry.product, entry.areaSqm));
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
 */
export const CartProvider = ({ children }: { children: ReactNode }) => {
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

  useEffect(() => {
    let active = true;

    const load = async () => {
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
        const cart = await cartApi.view();
        if (!active) return;
        const nextLines = cart.items
          .filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => !!item.product)
          .map((item) => buildLine(toProduct(item.product, item.product.collection?.title), Number(item.areaSqm)));
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
  }, [generation]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  const syncUpsert = useCallback((productId: string, areaSqm: number, onSynced?: () => void) => {
    if (syncTimers.current[productId]) window.clearTimeout(syncTimers.current[productId]);
    syncTimers.current[productId] = window.setTimeout(() => {
      // Failures are never surfaced — the cart stays local-first even when
      // this fails; the next fresh mount's server reconcile is what
      // recovers it (or gives up and shows what's actually saved).
      cartApi
        .upsertItem(productId, areaSqm)
        .then(() => onSynced?.())
        .catch((cause) => {
          console.error("Cart sync (upsert) failed:", cause);
        });
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const setQuantity = useCallback(
    (product: Product, areaSqm: number) => {
      const clamped = Math.round(Math.max(0.01, areaSqm) * 100) / 100;
      const isNewLine = !linesRef.current.some((line) => line.productId === product.id);
      setLines((current) => {
        const next = current.some((line) => line.productId === product.id)
          ? current.map((line) => (line.productId === product.id ? buildLine(product, clamped) : line))
          : [...current, buildLine(product, clamped)];
        writeCache(next);
        return next;
      });
      // A line added from anywhere other than the cart page itself (product
      // detail, catalog, compare) carries a `Product` that never had
      // `availableAreaSqm` on it (server-side, that field is cart-line-only —
      // see `ApiProduct.availableAreaSqm`), so `exceedsStock` reads as
      // `undefined` and the shortage banner silently never shows, however
      // large the quantity. Once the debounced upsert lands, re-fetching the
      // real cart view fills that field in for real.
      syncUpsert(product.id, clamped, isNewLine ? refresh : undefined);
    },
    [syncUpsert, refresh],
  );

  const removeItem = useCallback((productId: string) => {
    if (syncTimers.current[productId]) window.clearTimeout(syncTimers.current[productId]);
    setLines((current) => {
      const next = current.filter((line) => line.productId !== productId);
      writeCache(next);
      return next;
    });
    cartApi.removeItem(productId).catch((cause) => {
      console.error("Cart sync (remove) failed:", cause);
    });
  }, []);

  const clear = useCallback(() => {
    Object.values(syncTimers.current).forEach((timer) => window.clearTimeout(timer));
    syncTimers.current = {};
    setLines([]);
    writeCache([]);
    cartApi.clear().catch((cause) => {
      console.error("Cart sync (clear) failed:", cause);
    });
  }, []);

  const reset = useCallback(() => {
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
