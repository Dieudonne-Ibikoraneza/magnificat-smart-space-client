"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { CursorPage } from "@/lib/api/types";

type Options<T extends { id: string }> = {
  /** The first page, as fetched by `useApi` — a new identity means a fresh fetch, so everything loaded after it is dropped. */
  firstPage: CursorPage<T> | undefined;
  /** Fetches the page after `cursor`. */
  fetchPage: (cursor: string) => Promise<CursorPage<T>>;
  /** Shown when a "load more" fails for a reason with no message of its own. */
  fallbackError: string;
  /** What makes two rows "the same" when a page overlaps the previous one. Defaults to `id`. */
  getKey?: (item: T) => string;
};

/**
 * "Load more" for a cursor-paginated list: the first page comes from
 * `useApi`, and every page after it is appended here. Extra pages are
 * discarded whenever the first page is re-fetched (a search change, a retry,
 * a refetch-on-focus) — appending to a now-stale first page wouldn't make
 * sense — and rows that appear on two pages are only kept once.
 */
export const useCursorList = <T extends { id: string }>({ firstPage, fetchPage, fallbackError, getKey = (item) => item.id }: Options<T>) => {
  // Reset during render (React's own pattern for derived state) rather than
  // in an effect, so a stale extra page is never painted after a new first one.
  const [trackedFirstPage, setTrackedFirstPage] = useState(firstPage);
  const [extraItems, setExtraItems] = useState<T[]>([]);
  const [extraCursor, setExtraCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // The first page currently on screen, readable from inside an async
  // callback that closed over an older one. A "load more" still in flight when
  // the first page is replaced (a new search term, a retry) compares against it
  // when it lands and drops its result rather than appending old rows to the
  // new list.
  const currentFirstPage = useRef(firstPage);
  useEffect(() => {
    currentFirstPage.current = firstPage;
  }, [firstPage]);

  if (trackedFirstPage !== firstPage) {
    setTrackedFirstPage(firstPage);
    setExtraItems([]);
    setExtraCursor(undefined);
    setLoadingMore(false);
    setLoadMoreError(null);
  }

  const items = useMemo(() => [...(firstPage?.items ?? []), ...extraItems], [firstPage, extraItems]);
  const nextCursor = extraCursor !== undefined ? extraCursor : (firstPage?.nextCursor ?? null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const requestedFor = firstPage;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchPage(nextCursor);
      if (requestedFor !== currentFirstPage.current) return;
      setExtraItems((current) => {
        const seen = new Set([...(firstPage?.items ?? []), ...current].map(getKey));
        return [...current, ...page.items.filter((item) => !seen.has(getKey(item)))];
      });
      setExtraCursor(page.nextCursor);
    } catch (cause) {
      if (requestedFor !== currentFirstPage.current) return;
      setLoadMoreError(cause instanceof ApiError ? cause.message : fallbackError);
    } finally {
      // A stale request must not clear the flag for the list that replaced it.
      if (requestedFor === currentFirstPage.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage, firstPage, fallbackError, getKey]);

  return { items, nextCursor, hasMore: nextCursor !== null, loadingMore, loadMoreError, loadMore };
};
