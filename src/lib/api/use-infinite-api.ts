"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Paginated } from "./types";

export { InfiniteScrollTrigger } from "@/components/infinite-scroll-trigger";

type InfiniteState<T> = {
  key: string;
  items: T[];
  meta?: Paginated<T>["meta"];
  page: number;
  loading: boolean;
  error?: string;
};

/** Fetches one 20-row page at a time and appends subsequent pages on demand. */
export const useInfiniteApi = <T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  deps: unknown[] = [],
) => {
  const key = JSON.stringify(deps);
  const fetcherRef = useRef(fetchPage);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<InfiniteState<T>>({
    key,
    items: [],
    page: 1,
    loading: true,
  });

  useEffect(() => {
    fetcherRef.current = fetchPage;
  });

  if (state.key !== key) {
    setState({ key, items: [], page: 1, loading: true });
  }

  const current = state.key === key
    ? state
    : { key, items: [] as T[], page: 1, loading: true };

  useEffect(() => {
    let active = true;
    fetcherRef.current(current.page)
      .then((result) => {
        if (!active) return;
        setState((previous) => {
          if (previous.key !== key) return previous;
          return {
            key,
            page: result.meta.page,
            meta: result.meta,
            loading: false,
            items: result.meta.page === 1
              ? result.items
              : [...previous.items, ...result.items],
          };
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState((previous) => previous.key === key
          ? {
              ...previous,
              loading: false,
              error: cause instanceof Error ? cause.message : "Something went wrong loading this.",
            }
          : previous);
      });
    return () => { active = false; };
  }, [current.page, key, reloadToken]);

  const hasMore = Boolean(current.meta && current.meta.page < current.meta.totalPages);
  const loadMore = useCallback(() => {
    setState((previous) => {
      if (previous.key !== key || previous.loading || !previous.meta || previous.meta.page >= previous.meta.totalPages) {
        return previous;
      }
      return { ...previous, page: previous.page + 1, loading: true, error: undefined };
    });
  }, [key]);

  return {
    items: current.items,
    meta: current.meta,
    loading: current.loading && current.items.length === 0,
    loadingMore: current.loading && current.items.length > 0,
    error: current.error,
    hasMore,
    loadMore,
    reload: () => setReloadToken((value) => value + 1),
  };
};
