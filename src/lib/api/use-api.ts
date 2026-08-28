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
 * `fetcher` may be an inline closure — it is read through a ref, and only
 * `deps` decide when to re-run.
 */
export const useApi = <T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> => {
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${reloadToken}:${JSON.stringify(deps)}`;

  const [state, setState] = useState<InternalState<T>>({ key, loading: true });

  // Inputs changed: drop straight back to loading for the new key. Adjusting
  // state during render like this is cheaper than an effect + extra paint.
  if (state.key !== key) setState({ key, loading: true });

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
        if (active) setState({ key, data, loading: false });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState({
          key,
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
  }, [key]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  // While a new key is settling, `state` still holds the previous key's result —
  // report that as loading rather than briefly showing stale data.
  const settled = state.key === key;

  return {
    data: settled ? state.data : undefined,
    loading: !settled || state.loading,
    error: settled ? state.error : undefined,
    reload,
  };
};
