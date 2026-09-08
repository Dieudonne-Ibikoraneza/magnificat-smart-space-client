"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquareText, Search, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { chatbotApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { AskedQuestion, AskedQuestionsPage } from "@/lib/api/types";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const PAGE_SIZE = 20;

/** The admin page can ship before the companion backend route — treat that rollout gap as an empty dataset instead of a broken dashboard. */
const fetchAskedQuestions = async (params: {
  cursor?: string;
  limit?: number;
}): Promise<AskedQuestionsPage> => {
  try {
    return await chatbotApi.askedQuestions(params);
  } catch (cause) {
    if (cause instanceof ApiError && cause.isNotFound) return { items: [], nextCursor: null };
    throw cause;
  }
};

export default function AdminAskedQuestionsPage() {
  const {
    data: firstPage,
    loading,
    error,
    reload,
  } = useApi(() => fetchAskedQuestions({ limit: PAGE_SIZE }), []);

  // Pages fetched via "Load more", beyond what `useApi` itself tracks — reset
  // the moment the first page's own identity changes (a fresh fetch landed,
  // whether from `reload` or the automatic refetch-on-focus `useApi` does on
  // its own), since appending onto a now-stale first page wouldn't make sense.
  const [trackedFirstPage, setTrackedFirstPage] = useState(firstPage);
  const [extraItems, setExtraItems] = useState<AskedQuestion[]>([]);
  const [extraCursor, setExtraCursor] = useState<string | null | undefined>(undefined);
  if (trackedFirstPage !== firstPage) {
    setTrackedFirstPage(firstPage);
    setExtraItems([]);
    setExtraCursor(undefined);
  }

  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const questions = useMemo(() => [...(firstPage?.items ?? []), ...extraItems], [firstPage, extraItems]);
  const nextCursor = extraCursor !== undefined ? extraCursor : (firstPage?.nextCursor ?? null);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchAskedQuestions({ cursor: nextCursor, limit: PAGE_SIZE });
      setExtraItems((current) => [...current, ...page.items]);
      setExtraCursor(page.nextCursor);
    } catch (cause) {
      setLoadMoreError(cause instanceof ApiError ? cause.message : "Unable to load more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return questions;
    return questions.filter((item) =>
      [item.question, item.user?.fullName, item.user?.email, item.conversation?.title]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [questions, search]);

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="Asked Questions"
        subtitle="What customers ask the AI assistant once it's already recommended something — real follow-up questions, concerns and objections, for support and marketing."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-32" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-40" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-ink"><MessageSquareText className="size-5" /></div>
              <p className="mt-4 text-sm text-muted">Questions captured</p>
              <p className="mt-1 text-2xl font-bold text-ink">{questions.length}{nextCursor ? "+" : ""}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5eee3] text-ink"><UsersRound className="size-5" /></div>
              <p className="mt-4 text-sm text-muted">Customer conversations</p>
              <p className="mt-1 text-2xl font-bold text-ink">{new Set(questions.map((item) => item.conversationId)).size}</p>
            </div>
          </>
        )}
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-bold text-ink">Customer questions</h2><p className="mt-1 text-xs text-muted">A searchable record for support, product and campaign insights.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="h-10 pl-10" aria-label="Search asked questions" /></div>
        </div>
        {loading ? <div className="space-y-4 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div> : error ? <ApiErrorState message={error} onRetry={reload} /> : filtered.length === 0 ? <ApiEmptyState message={search ? "No questions match your search." : "No customer questions have been captured yet."} className="py-16" /> : (
          <>
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <article key={item.id} className="p-5 transition-colors hover:bg-[#fcfdf8]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6 text-ink">{item.question}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.user?.fullName ?? "Guest customer"}
                        {item.user?.email ? ` · ${item.user.email}` : ""}
                        {item.conversation?.title ? ` · ${item.conversation.title}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[11px] font-medium">{formatDate(item.createdAt)}</Badge>
                  </div>
                </article>
              ))}
            </div>
            {!search && nextCursor && (
              <div className="flex flex-col items-center gap-2 border-t border-slate-100 p-5">
                <Button type="button" variant="outline" onClick={() => void loadMore()} disabled={loadingMore} className="gap-2">
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
                {loadMoreError && <p className="text-xs text-red-600">{loadMoreError}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
