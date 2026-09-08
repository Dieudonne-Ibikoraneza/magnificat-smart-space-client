"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./client";

export type ApiState<T> = {
  data: T | undefined;
  /**
   * True only when there's nothing to show yet for the current query — a
   * first load, a genuinely different query (different `deps`), or a retry
   * after an error. A `reload()` of the *same* query that already has data
   * (a manual retry, or the automatic refetch-on-focus below) never sets
   * this — see `refreshing` for that case instead. A page that gates its
   * whole render on `if (loading) return <Skeleton />` never flashes one
   * over content that's already on screen.
   */
  loading: boolean;
  /** True while a reload of the *same*, already-loaded query is in flight in the background — nothing to render for this on its own; it's there for a page that wants a subtle "updating…" touch. */
  refreshing: boolean;
  /** Human-readable message from the server, or a connection failure. */
  error: string | undefined;
  /** Re-runs the request; use it for a retry button. */
  reload: () => void;
};

type InternalState<T> = {
  /** Which run this result belongs to, so a stale one can be recognised. */
  key: string;
  /** The `deps` half of `key` — lets a `reload()` be told apart from a genuine input change. */
  depsKey: string;
  data?: T;
  error?: string;
  loading: boolean;
};

/** Skip an automatic refetch-on-focus if the last one settled more recently than this — otherwise switching tabs rapidly would refire the request every time. */
const MIN_REFOCUS_INTERVAL_MS = 15_000;

/**
 * Runs an API call on mount, and again whenever `deps` change or `reload` is
 * called, exposing the three states a screen has to render: loading, error,
 * loaded. A request still in flight when the inputs change is ignored rather
 * than allowed to overwrite a newer result, so rapid filter changes can't land
 * out of order.
 *
 * A `reload()` of the *same* query (e.g. re-fetching the cart after a
 * quantity edit) keeps the last good result on screen while the new one
 * loads, instead of blanking the whole page to a spinner over one small
 * change. A genuine input change (different `deps`) still resets to blank —
 * showing the previous entity's data while a new one loads would be
 * misleading, not just stale.
 *
 * Also reloads on its own whenever the tab/window regains focus or
 * visibility (throttled by `MIN_REFOCUS_INTERVAL_MS`) — without this, a page
 * left open in a background tab (an order's status, a product's stock) only
 * ever shows what it looked like at the moment it was first loaded, and the
 * only way to see anything newer is a full browser refresh. Every screen
 * built on this hook gets that for free.
 *
 * `fetcher` may be an inline closure — it is read through a ref, and only
 * `deps` decide when to re-run.
 */
export const useApi = <T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> => {
  const [reloadToken, setReloadToken] = useState(0);
  const depsKey = JSON.stringify(deps);
  const key = `${reloadToken}:${depsKey}`;

  const [state, setState] = useState<InternalState<T>>({ key, depsKey, loading: true });

  // Inputs changed: adjusting state during render like this is cheaper than
  // an effect + extra paint. Only a genuinely different query clears `data`.
  if (state.key !== key) {
    const sameQuery = state.depsKey === depsKey;
    setState({ key, depsKey, loading: true, data: sameQuery ? state.data : undefined });
  }

  // Latest-value ref, updated in its own effect so nothing is written during render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // When the last fetch for this exact query settled — read by the
  // refetch-on-focus effect below to throttle itself.
  const lastSettledAtRef = useRef(0);

  useEffect(() => {
    let active = true;

    fetcherRef
      .current()
      .then((data) => {
        if (!active) return;
        lastSettledAtRef.current = Date.now();
        setState({ key, depsKey, data, loading: false });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        lastSettledAtRef.current = Date.now();
        setState({
          key,
          depsKey,
          error:
            cause instanceof ApiError
              ? cause.message
              : "Something went wrong loading this. Please try again.",
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [key, depsKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const refetchIfStale = () => {
      if (Date.now() - lastSettledAtRef.current > MIN_REFOCUS_INTERVAL_MS) reload();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetchIfStale();
    };
    window.addEventListener("focus", refetchIfStale);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refetchIfStale);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reload]);

  // While a new key is settling, `state` may still be catching up (its own
  // effect hasn't landed yet) — that's still in flight, whatever `data` it's
  // holding onto in the meantime.
  const settled = state.key === key;
  const fetching = !settled || state.loading;
  // Something is already on screen for this exact query — a fetch in flight
  // alongside that is a background refresh, not a "loading" state.
  const hasData = state.data !== undefined;

  return {
    data: state.data,
    loading: fetching && !hasData,
    refreshing: fetching && hasData,
    error: settled ? state.error : undefined,
    reload,
  };
};
