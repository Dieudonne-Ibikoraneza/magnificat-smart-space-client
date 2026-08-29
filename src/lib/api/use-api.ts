"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./client";

export type ApiState<T> = {
  data: T | undefined;
  loading: boolean;
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

  useEffect(() => {
    let active = true;

    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ key, depsKey, data, loading: false });
      })
      .catch((cause: unknown) => {
        if (!active) return;
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

  // While a new key is settling, `state` may still be catching up (its own
  // effect hasn't landed yet) — that's still `loading`, whatever `data` it's
  // holding onto in the meantime.
  const settled = state.key === key;

  return {
    data: state.data,
    loading: !settled || state.loading,
    error: settled ? state.error : undefined,
    reload,
  };
};
