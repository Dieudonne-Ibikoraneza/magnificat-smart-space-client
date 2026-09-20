"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { favoritesApi, tokenStore } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/components/ui/toast";
import type { Product } from "@/components/product-card";

type FavoritesState = {
  /** True only until the very first read (cache or server) has landed. */
  loading: boolean;
  isFavorited: (productId: string) => boolean;
  /**
   * Flips instantly and locally — the like button's animation has something
   * real to react to on the very same frame it's clicked, no network wait.
   * The actual add/remove call runs in the background afterwards; if it
   * fails, the flip is quietly reverted and a toast explains why, the same
   * shape as `useCart`'s optimistic updates.
   */
  toggle: (product: Product) => void;
  /** Forces a fresh read from the server — e.g. right after login. */
  refresh: () => void;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

const STORAGE_KEY = "mss.favorites.v1";

/**
 * The local copy belongs to one account: it is stored with the id of the user
 * it was saved for and only ever read back for that same user. An unkeyed copy
 * would show the previous person's favorites to whoever signs in next on this
 * device — until the server answers, and for good if it never does.
 */
const readCache = (userId: string): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { userId?: string; ids?: string[] } | string[];
    // An older, unkeyed copy has no owner — it can't be trusted for anyone. Someone
    // else's copy is dropped from this device now that a different account is known.
    if (Array.isArray(parsed) || parsed.userId !== userId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.ids ?? [];
  } catch {
    return [];
  }
};

/** Nobody is signed in: the local copy belongs to no one and is removed. */
const clearCache = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing was kept.
  }
};

/** Saves the local copy for `userId`; while the account isn't known yet there is nothing to file it under. */
const writeCache = (ids: Iterable<string>, userId: string | null) => {
  try {
    if (userId) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, ids: [...ids] }));
  } catch {
    // Storage unavailable (private window, blocked site data) — favorites
    // still work for this visit, they just won't survive a reload.
  }
};

/**
 * Which products the signed-in customer has favorited — local-first, the
 * same shape as `CartProvider`: every toggle updates state (and
 * localStorage) immediately, and the server write happens in the
 * background. A fresh mount re-fetches the real list from the server and
 * replaces whatever's local, which also self-heals from a background save
 * that failed earlier instead of leaving the UI permanently out of sync
 * with what's actually stored.
 */
export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: sessionLoading } = useCurrentUser();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  // Whose favorites `ids` holds. When the signed-in account changes — signed out,
  // session ended, someone else signed in — the previous account's list is
  // dropped at once, before anything of the new account's is shown. A session
  // check that is merely in progress says nothing about who is signed in, so it
  // never counts as a change.
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  if (!sessionLoading && owner !== userId) {
    setOwner(userId);
    if (owner) setIds(new Set());
  }
  const userIdRef = useRef<string | null>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);
  // Read inside `toggle` without making it depend on (and get re-memoized
  // every time) `ids` itself.
  const idsRef = useRef<Set<string>>(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

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
          setIds(new Set());
          clearCache();
          setLoading(false);
        }
        return;
      }

      // Instant paint from what was cached for THIS account last session,
      // before the server round trip below even starts — same reasoning as the
      // cart. Nothing is painted until we know whose it would be.
      const cached = userId ? readCache(userId) : [];
      if (cached.length > 0 && active) setIds(new Set(cached));

      try {
        const favorites = await favoritesApi.list();
        if (!active) return;
        const nextIds = favorites.map((row) => row.productId);
        setIds(new Set(nextIds));
        writeCache(nextIds, userId);
      } catch {
        // A failed background read isn't worth an error screen over — the
        // visitor still has whatever was cached (or an empty list).
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [generation, userId]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  const isFavorited = useCallback((productId: string) => ids.has(productId), [ids]);

  const toggle = useCallback((product: Product) => {
    const wasFavorited = idsRef.current.has(product.id);
    const nextFavorited = !wasFavorited;

    setIds((current) => {
      const next = new Set(current);
      if (nextFavorited) next.add(product.id);
      else next.delete(product.id);
      writeCache(next, userIdRef.current);
      return next;
    });

    const call = nextFavorited ? favoritesApi.add(product.id) : favoritesApi.remove(product.id);
    call.catch((cause) => {
      // The optimistic flip didn't actually stick server-side — revert it
      // rather than leave the button lying about what's saved.
      setIds((current) => {
        const next = new Set(current);
        if (nextFavorited) next.delete(product.id);
        else next.add(product.id);
        writeCache(next, userIdRef.current);
        return next;
      });
      toast.error(nextFavorited ? "Couldn't save that favorite" : "Couldn't remove that favorite", {
        description: cause instanceof ApiError ? cause.message : "Please check your connection and try again.",
      });
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ loading, isFavorited, toggle, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside FavoritesProvider");
  return context;
};
