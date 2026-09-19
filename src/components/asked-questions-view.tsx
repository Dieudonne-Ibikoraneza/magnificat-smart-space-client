"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MessageSquareText, Search, UsersRound } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-headers";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { chatbotApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useCursorList } from "@/lib/use-cursor-list";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const PAGE_SIZE = 20;

/**
 * Questions customers asked the chatbot after it had already recommended
 * something (`GET /chatbot/admin/asked-questions`, admin + data analyst) —
 * real follow-up questions, concerns and objections, for support and
 * marketing. One implementation for both roles' `…/asked-questions` pages;
 * the copy is role-neutral, so both read the shared `admin.askedQuestions.*`
 * strings.
 */
export function AskedQuestionsView() {
  const { t } = useTranslation();
  const {
    data: firstPage,
    loading,
    error,
    reload,
  } = useApi(() => chatbotApi.askedQuestions({ limit: PAGE_SIZE }), []);

  const [search, setSearch] = useState("");
  const {
    items: questions,
    nextCursor,
    loadingMore,
    loadMoreError,
    loadMore,
  } = useCursorList({
    firstPage,
    fetchPage: (cursor) => chatbotApi.askedQuestions({ cursor, limit: PAGE_SIZE }),
    fallbackError: t("admin.askedQuestions.loadMoreError"),
  });

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
      <DashboardPageHeader
        title={t("admin.askedQuestions.title")}
        subtitle={t("admin.askedQuestions.subtitle")}
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
              <p className="mt-4 text-sm text-muted">{t("admin.askedQuestions.questionsCaptured")}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{questions.length}{nextCursor ? "+" : ""}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5eee3] text-ink"><UsersRound className="size-5" /></div>
              <p className="mt-4 text-sm text-muted">{t("admin.askedQuestions.customerConversations")}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{new Set(questions.map((item) => item.conversationId)).size}</p>
            </div>
          </>
        )}
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-bold text-ink">{t("admin.askedQuestions.customerQuestions")}</h2><p className="mt-1 text-xs text-muted">{t("admin.askedQuestions.customerQuestionsSub")}</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.askedQuestions.searchPlaceholder")} className="h-10 pl-10" aria-label={t("admin.askedQuestions.searchAria")} /></div>
        </div>
        {loading ? <div className="space-y-4 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div> : error ? <ApiErrorState message={error} onRetry={reload} /> : filtered.length === 0 ? <ApiEmptyState message={search ? t("admin.askedQuestions.noMatch") : t("admin.askedQuestions.noneCaptured")} className="py-16" /> : (
          <>
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <article key={item.id} className="p-5 transition-colors hover:bg-[#fcfdf8]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6 text-ink">{item.question}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.user?.fullName ?? t("admin.askedQuestions.guestCustomer")}
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
                  {loadingMore ? t("staff.loading") : t("admin.askedQuestions.loadMore")}
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
