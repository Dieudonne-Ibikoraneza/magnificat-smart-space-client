"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Bot,
  CircleCheck,
  CircleSlash,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { DashboardPageHeader as AdminPageHeader } from "@/components/dashboard-page-headers";
import { RecommendationExclusions } from "@/components/recommendation-exclusions";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { chatbotApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiKnowledgeBaseEntry } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/utils";

type EntryDraft = {
  question: string;
  answer: string;
  tags: string;
};

const emptyDraft: EntryDraft = { question: "", answer: "", tags: "" };

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Chatbot knowledge base management (doc 3.10). Entries are the answers the AI
 * assistant is allowed to give, managed as English source entries.
 */
export default function AdminKnowledgeBasePage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi(() => chatbotApi.adminKnowledgeBase());
  const entries = useMemo(() => (data ?? []).filter((entry) => entry.language === "EN"), [data]);
  const [view, setView] = useState<"entries" | "tiles">("entries");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ApiKnowledgeBaseEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingEntry, setConfirmingEntry] = useState<ApiKnowledgeBaseEntry | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusSaving = confirmingEntry !== null && busyId === confirmingEntry.id;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!term) return true;
      return (
        entry.question.toLowerCase().includes(term) ||
        entry.answer.toLowerCase().includes(term) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [entries, search]);

  const stats = [
    { key: "total", label: t("admin.knowledgeBase.statTotalEntries"), value: entries.length, icon: BookOpen },
    { key: "active", label: t("admin.knowledgeBase.statActive"), value: entries.filter((entry) => entry.isActive).length, icon: CircleCheck },
  ];

  const openCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (entry: ApiKnowledgeBaseEntry) => {
    setDraft({
      question: entry.question,
      answer: entry.answer,
      tags: entry.tags.join(", "),
    });
    setEditing(entry);
    setCreating(false);
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
  };

  const valid = draft.question.trim() !== "" && draft.answer.trim() !== "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    setSubmitting(true);
    try {
      const body = {
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        tags,
        language: "EN" as const,
      };
      if (editing) {
        await chatbotApi.updateKnowledgeBaseEntry(editing.id, body);
        toast.success(t("admin.knowledgeBase.toastEntryUpdated"));
      } else {
        await chatbotApi.createKnowledgeBaseEntry(body);
        toast.success(t("admin.knowledgeBase.toastEntryAdded"), {
          description: t("admin.knowledgeBase.toastEntryAddedDesc"),
        });
      }
      closeDialog();
      reload();
    } catch (cause) {
      toast.error(t("admin.knowledgeBase.toastSaveFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (entry: ApiKnowledgeBaseEntry) => {
    if (busyId !== null) return;
    setBusyId(entry.id);
    setStatusError(null);
    try {
      await chatbotApi.updateKnowledgeBaseEntry(entry.id, { isActive: !entry.isActive });
      toast.success(
        entry.isActive
          ? t("admin.knowledgeBase.toastEntryDeactivated")
          : t("admin.knowledgeBase.toastEntryActivated"),
      );
      setConfirmingEntry(null);
      reload();
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain");
      setStatusError(message);
      toast.error(t("admin.knowledgeBase.toastSaveFailed"), {
        description: message,
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await chatbotApi.deleteKnowledgeBaseEntry(id);
      toast.success(t("admin.knowledgeBase.toastEntryDeleted"));
      reload();
    } catch (cause) {
      toast.error(t("admin.knowledgeBase.toastDeleteFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-10">
      <AdminPageHeader
        title={t("admin.knowledgeBase.title")}
        subtitle={t("admin.knowledgeBase.subtitle")}
      >
        {view === "entries" && <Button type="button" onClick={openCreate} className="h-11 shrink-0 gap-2 font-bold">
          <Plus className="size-4" /> {t("admin.knowledgeBase.addEntry")}
        </Button>}
      </AdminPageHeader>

      <div className="mt-6 flex flex-wrap gap-x-5 border-b border-border">
        <Button type="button" variant="ghost" aria-pressed={view === "entries"} onClick={() => setView("entries")} className={cn("-mb-px h-11 gap-2 rounded-none border-0 border-b-2 px-1 text-sm font-semibold hover:bg-transparent", view === "entries" ? "border-ink text-ink" : "border-transparent text-muted-foreground")}>
          <BookOpen className="size-4" /> {t("admin.knowledgeBase.entriesTab")}
        </Button>
        <Button type="button" variant="ghost" aria-pressed={view === "tiles"} onClick={() => setView("tiles")} className={cn("-mb-px h-11 gap-2 rounded-none border-0 border-b-2 px-1 text-sm font-semibold hover:bg-transparent", view === "tiles" ? "border-ink text-ink" : "border-transparent text-muted-foreground")}>
          <CircleSlash className="size-4" /> {t("admin.knowledgeBase.exclusions.title")}
        </Button>
      </div>

      {view === "tiles" ? <RecommendationExclusions />
        : loading ? <ApiLoading label={t("admin.knowledgeBase.loading")} className="mt-12" />
        : error ? <ApiErrorState message={error} onRetry={reload} className="mt-8" />
        : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stats.map(({ key, label, value, icon: Icon }) => (
          <article key={key} className="rounded-2xl bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted-background text-ink">
              <Icon className="size-5" />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-black text-ink">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.knowledgeBase.searchPlaceholder")}
            aria-label={t("admin.knowledgeBase.searchAria")}
            className="h-11 rounded-lg pl-10 text-sm"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((entry) => (
          <article key={entry.id} className="rounded-2xl bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-ink">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink">{entry.question}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{entry.answer}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={entry.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                  {entry.isActive ? t("admin.knowledgeBase.active") : t("admin.knowledgeBase.inactive")}
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted-background px-2 py-1 font-data text-[11px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {t("admin.knowledgeBase.updated", { date: formatDate(entry.updatedAt) })}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openEdit(entry)}
                  className="h-9 gap-1.5 text-xs font-bold"
                >
                  <Pencil className="size-3.5" /> {t("admin.knowledgeBase.edit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStatusError(null);
                    setConfirmingEntry(entry);
                  }}
                  disabled={busyId !== null}
                  aria-haspopup="dialog"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-bold",
                    entry.isActive
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800",
                  )}
                >
                  {entry.isActive ? <CircleSlash className="size-3.5" /> : <CircleCheck className="size-3.5" />}
                  {entry.isActive ? t("admin.knowledgeBase.deactivate") : t("admin.knowledgeBase.activate")}
                </Button>
                <ConfirmDialog
                  title={t("admin.knowledgeBase.deleteEntryTitle")}
                  description={t("admin.knowledgeBase.deleteEntryDescription")}
                  confirmLabel={t("admin.knowledgeBase.deleteEntryConfirm")}
                  onConfirm={() => void remove(entry.id)}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("admin.knowledgeBase.deleteEntryAria")}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            {t("admin.knowledgeBase.noMatch")}
          </p>
        )}
      </div>

      </>}

      <Dialog
        open={confirmingEntry !== null}
        onOpenChange={(open) => {
          if (!open && !statusSaving) setConfirmingEntry(null);
        }}
      >
        <DialogContent className="max-w-sm" showClose={!statusSaving} aria-busy={statusSaving}>
          <DialogHeader>
            <span className={cn(
              "mb-3 flex size-11 items-center justify-center rounded-xl border",
              confirmingEntry?.isActive
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-600",
            )}>
              {confirmingEntry?.isActive ? <CircleSlash aria-hidden="true" className="size-5" /> : <CircleCheck aria-hidden="true" className="size-5" />}
            </span>
            <DialogTitle>{t(`admin.knowledgeBase.${confirmingEntry?.isActive ? "confirmDeactivateTitle" : "confirmActivateTitle"}`)}</DialogTitle>
            <DialogDescription className="leading-6">
              {t(`admin.knowledgeBase.${confirmingEntry?.isActive ? "confirmDeactivateDescription" : "confirmActivateDescription"}`)}
            </DialogDescription>
          </DialogHeader>
          {confirmingEntry && (
            <div className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("admin.knowledgeBase.questionLabel")}</p>
              <p className="mt-1 max-h-32 overflow-y-auto break-words text-sm font-semibold leading-6 text-ink">{confirmingEntry.question}</p>
            </div>
          )}
          {statusError && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusError}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={statusSaving} onClick={() => setConfirmingEntry(null)} className="h-10 px-5 text-sm font-bold">
              {t("admin.knowledgeBase.cancel")}
            </Button>
            <Button
              type="button"
              disabled={statusSaving}
              onClick={() => {
                if (confirmingEntry) void toggleActive(confirmingEntry);
              }}
              className={cn(
                "h-10 gap-2 px-5 text-sm font-bold text-white",
                confirmingEntry?.isActive ? "bg-amber-700 hover:bg-amber-800" : "bg-emerald-700 hover:bg-emerald-800",
              )}
            >
              {statusSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {t(`admin.knowledgeBase.${confirmingEntry?.isActive ? (statusSaving ? "deactivating" : "deactivate") : (statusSaving ? "activating" : "activate")}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating || editing !== null} onOpenChange={(open: boolean) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("admin.knowledgeBase.dialogEditTitle") : t("admin.knowledgeBase.dialogAddTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.knowledgeBase.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="kb-question">{t("admin.knowledgeBase.questionLabel")}</FieldLabel>
              <Input
                id="kb-question"
                required
                value={draft.question}
                onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
                placeholder={t("admin.knowledgeBase.questionPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="kb-answer">{t("admin.knowledgeBase.answerLabel")}</FieldLabel>
              <Textarea
                id="kb-answer"
                required
                rows={4}
                value={draft.answer}
                onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))}
                placeholder={t("admin.knowledgeBase.answerPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="kb-tags">{t("admin.knowledgeBase.tagsLabel")}</FieldLabel>
              <Input
                id="kb-tags"
                value={draft.tags}
                onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder={t("admin.knowledgeBase.tagsPlaceholder")}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} className="h-10 px-5 text-sm font-bold">
                {t("admin.knowledgeBase.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!valid || submitting}
                className="h-10 px-5 text-sm font-bold disabled:opacity-60"
              >
                {editing ? t("admin.knowledgeBase.saveChanges") : t("admin.knowledgeBase.addEntry")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
