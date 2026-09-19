"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Bot,
  CircleCheck,
  CircleSlash,
  Languages,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { DashboardPageHeader as AdminPageHeader } from "@/components/dashboard-page-headers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { chatbotApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiKnowledgeBaseEntry, Language } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/utils";

type KnowledgeBaseLanguage = Extract<Language, "EN" | "RW">;

type EntryDraft = {
  question: string;
  answer: string;
  tags: string;
  language: KnowledgeBaseLanguage;
};

const emptyDraft: EntryDraft = { question: "", answer: "", tags: "", language: "EN" };

const LANGUAGE_KEYS: Record<KnowledgeBaseLanguage, string> = {
  EN: "admin.knowledgeBase.languageEnglish",
  RW: "admin.knowledgeBase.languageKinyarwanda",
};

const languageFilters = ["all", "EN", "RW"] as const;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Chatbot knowledge base management (doc 3.10). Entries are the answers the AI
 * assistant is allowed to give verbatim, maintained per platform language so
 * the bilingual requirement in section 2 holds for chatbot answers too.
 */
export default function AdminKnowledgeBasePage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi(() => chatbotApi.adminKnowledgeBase());
  const entries = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<(typeof languageFilters)[number]>("all");
  const [editing, setEditing] = useState<ApiKnowledgeBaseEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (language !== "all" && entry.language !== language) return false;
      if (!term) return true;
      return (
        entry.question.toLowerCase().includes(term) ||
        entry.answer.toLowerCase().includes(term) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [entries, language, search]);

  const stats = [
    { key: "total", label: t("admin.knowledgeBase.statTotalEntries"), value: entries.length, icon: BookOpen },
    { key: "active", label: t("admin.knowledgeBase.statActive"), value: entries.filter((entry) => entry.isActive).length, icon: CircleCheck },
    { key: "rw", label: t("admin.knowledgeBase.statKinyarwanda"), value: entries.filter((entry) => entry.language === "RW").length, icon: Languages },
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
      language: entry.language,
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
        language: draft.language,
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
    setBusyId(entry.id);
    try {
      await chatbotApi.updateKnowledgeBaseEntry(entry.id, { isActive: !entry.isActive });
      toast.success(
        entry.isActive
          ? t("admin.knowledgeBase.toastEntryDeactivated")
          : t("admin.knowledgeBase.toastEntryActivated"),
      );
      reload();
    } catch (cause) {
      toast.error(t("admin.knowledgeBase.toastSaveFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
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

  if (loading) {
    return (
      <div className="pb-10">
        <AdminPageHeader
          title={t("admin.knowledgeBase.title")}
          subtitle={t("admin.knowledgeBase.subtitle")}
        />
        <ApiLoading label={t("admin.knowledgeBase.loading")} className="mt-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-10">
        <AdminPageHeader
          title={t("admin.knowledgeBase.title")}
          subtitle={t("admin.knowledgeBase.subtitle")}
        />
        <ApiErrorState message={error} onRetry={reload} className="mt-8" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title={t("admin.knowledgeBase.title")}
        subtitle={t("admin.knowledgeBase.subtitle")}
      >
        <Button type="button" onClick={openCreate} className="h-11 shrink-0 gap-2 font-bold">
          <Plus className="size-4" /> {t("admin.knowledgeBase.addEntry")}
        </Button>
      </AdminPageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
        <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
          {languageFilters.map((value) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              onClick={() => setLanguage(value)}
              className={cn(
                "h-9 rounded-lg px-3 text-xs font-bold",
                language === value ? "bg-ink text-primary hover:bg-ink/90" : "text-muted-foreground",
              )}
            >
              {value === "all" ? t("admin.knowledgeBase.filterAll") : value}
            </Button>
          ))}
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
                <Badge variant="outline">{entry.language}</Badge>
                <Badge variant={entry.isActive ? "primary" : "muted"}>
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
                  onClick={() => void toggleActive(entry)}
                  disabled={busyId === entry.id}
                  className="h-9 gap-1.5 text-xs font-bold"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="kb-language">{t("admin.knowledgeBase.languageLabel")}</FieldLabel>
                <Select
                  value={draft.language}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      language: (value ?? current.language) as KnowledgeBaseLanguage,
                    }))
                  }
                >
                  <SelectTrigger id="kb-language" className="h-10 w-full text-sm">
                    <SelectValue>{(value) => t(LANGUAGE_KEYS[value as KnowledgeBaseLanguage])}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LANGUAGE_KEYS) as KnowledgeBaseLanguage[]).map((code) => (
                      <SelectItem key={code} value={code}>
                        {t(LANGUAGE_KEYS[code])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>

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
