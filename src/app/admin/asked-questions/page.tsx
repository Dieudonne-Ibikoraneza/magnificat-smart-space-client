"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Search, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { chatbotApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AskedQuestion } from "@/lib/api/types";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminAskedQuestionsPage() {
  const [questions, setQuestions] = useState<AskedQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let active = true;
    chatbotApi.askedQuestions()
      .then((result) => { if (active) setQuestions(result); })
      .catch((cause) => {
        if (!active) return;
        // The admin page can ship before the companion backend route; treat
        // that rollout gap as an empty dataset instead of a broken dashboard.
        if (cause instanceof ApiError && cause.isNotFound) {
          setQuestions([]);
          return;
        }
        setError(cause instanceof ApiError ? cause : new ApiError(0, "Unable to load asked questions."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return questions;
    return questions.filter((item) =>
      [item.question, item.answer, item.customerName, item.customerEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [questions, search]);

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="Asked Questions"
        subtitle="Understand what customers ask the AI assistant and turn recurring needs into better marketing content."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-ink"><MessageSquareText className="size-5" /></div>
          <p className="mt-4 text-sm text-muted">Questions captured</p>
          <p className="mt-1 text-2xl font-bold text-ink">{questions.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5eee3] text-ink"><UsersRound className="size-5" /></div>
          <p className="mt-4 text-sm text-muted">Customer conversations</p>
          <p className="mt-1 text-2xl font-bold text-ink">{new Set(questions.map((item) => item.conversationId)).size}</p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-bold text-ink">Customer questions</h2><p className="mt-1 text-xs text-muted">A searchable record for support, product and campaign insights.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="h-10 pl-10" aria-label="Search asked questions" /></div>
        </div>
        {loading ? <div className="space-y-4 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div> : error ? <ApiErrorState message={error.message} onRetry={() => window.location.reload()} /> : filtered.length === 0 ? <ApiEmptyState message={search ? "No questions match your search." : "No customer questions have been captured yet."} className="py-16" /> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <article key={item.id} className="p-5 transition-colors hover:bg-[#fcfdf8]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-6 text-ink">{item.question}</p><p className="mt-1 text-xs text-muted">{item.customerName ?? "Guest customer"}{item.customerEmail ? ` · ${item.customerEmail}` : ""}</p></div>
                  <Badge variant="outline" className="shrink-0 text-[11px] font-medium">{formatDate(item.createdAt)}</Badge>
                </div>
                {item.answer && <p className="mt-3 rounded-xl bg-muted-background px-4 py-3 text-xs leading-5 text-slate-600"><span className="font-bold text-ink">Assistant response:</span> {item.answer}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
