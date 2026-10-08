"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  GripVertical,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { settingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AdminChatbotFollowUp } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { useSortableList } from "@/lib/use-sortable-list";
import { cn } from "@/lib/utils";

const FollowUpDialog = ({
  question,
  disabled,
  onSaved,
}: {
  question?: AdminChatbotFollowUp;
  disabled: boolean;
  onSaved: () => void;
}) => {
  const { t } = useTranslation();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(question?.text ?? "");
  const [isActive, setIsActive] = useState(question?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const valid = text.trim().length > 0 && text.trim().length <= 300;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const body = { text: text.trim(), isActive };
      if (question) await settingsApi.updateFollowUpQuestion(question.id, body);
      else await settingsApi.createFollowUpQuestion(body);
      toast.success(t("admin.systemSettings.followUps.saved"));
      onSaved();
      setOpen(false);
    } catch (cause) {
      toast.error(t("admin.systemSettings.followUps.saveFailed"), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        setOpen(next);
        if (next) {
          setText(question?.text ?? "");
          setIsActive(question?.isActive ?? true);
        }
      }}
    >
      <DialogTrigger
        render={
          question ? (
            <button
              type="button"
              disabled={disabled}
              aria-label={`${t("admin.systemSettings.followUps.edit")}: ${question.text}`}
              title={t("admin.systemSettings.followUps.edit")}
              className="rounded-md p-1.5 text-ink transition-colors hover:bg-secondary focus-visible:bg-secondary disabled:opacity-50"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-10 shrink-0 gap-2 border-border px-4 text-sm font-semibold text-ink"
            />
          )
        }
      >
        {question ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {!question && t("admin.systemSettings.followUps.add")}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(`admin.systemSettings.followUps.${question ? "edit" : "add"}`)}
          </DialogTitle>
          <DialogDescription>
            {t("admin.systemSettings.followUps.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor={`${fieldId}-text`}>
              {t("admin.systemSettings.followUps.question")}
            </FieldLabel>
            <Textarea
              id={`${fieldId}-text`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={300}
              rows={3}
              disabled={saving}
              placeholder={t("admin.systemSettings.followUps.placeholder")}
              className="min-h-28 text-sm leading-relaxed"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            {t("admin.systemSettings.followUps.textHint")}
          </p>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {t("admin.systemSettings.followUps.enabled")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("admin.systemSettings.followUps.enabledHint")}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving}
              aria-label={t("admin.systemSettings.followUps.enabled")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="h-10 px-5 text-sm font-bold"
          >
            {t("admin.systemSettings.dialogCancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !valid}
            className="h-10 px-5 text-sm font-bold"
          >
            {t(
              `admin.systemSettings.${saving ? "dialogSaving" : "dialogSave"}`,
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteFollowUpButton = ({
  question,
  disabled,
  onDeleted,
}: {
  question: AdminChatbotFollowUp;
  disabled: boolean;
  onDeleted: () => void;
}) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await settingsApi.deleteFollowUpQuestion(question.id);
      toast.success(t("admin.systemSettings.followUps.deleted"));
      onDeleted();
    } catch (cause) {
      toast.error(t("admin.systemSettings.followUps.deleteFailed"), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setDeleting(false);
    }
  };
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          disabled={disabled || deleting}
          aria-label={`${t("admin.systemSettings.followUps.delete")}: ${question.text}`}
          title={t("admin.systemSettings.followUps.delete")}
          className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      }
      title={t("admin.systemSettings.followUps.deleteTitle")}
      description={t("admin.systemSettings.followUps.deleteDescription")}
      confirmLabel={t("admin.systemSettings.followUps.delete")}
      onConfirm={() => void remove()}
    />
  );
};

export const AdminChatbotFollowUps = () => {
  const { t } = useTranslation();
  const { data, loading, refreshing, error, reload } = useApi(() =>
    settingsApi.adminFollowUpQuestions(),
  );
  const questions = useMemo(() => data ?? [], [data]);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const { order, draggingId, saving, getHandleProps } = useSortableList({
    items: questions,
    containerRef: tbodyRef,
    onReorder: async (ordered) => {
      try {
        await settingsApi.reorderFollowUpQuestions(
          ordered.map((question) => question.id),
        );
      } catch (cause) {
        toast.error(t("admin.systemSettings.toastOrderFailed"), {
          description:
            cause instanceof ApiError
              ? cause.message
              : t("admin.systemSettings.toastTryAgain"),
        });
        throw cause;
      }
      toast.success(t("admin.systemSettings.toastOrderSaved"));
      reload();
    },
  });
  const busy = loading || refreshing || saving;

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-ink">
            <MessageSquareText className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">
              {t("admin.systemSettings.followUps.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.systemSettings.followUps.description")}
            </p>
          </div>
        </div>
        <FollowUpDialog
          disabled={busy || !!error || !!draggingId}
          onSaved={reload}
        />
      </div>
      <div className="mt-5 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        {error ? (
          <ApiErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <ApiLoading />
        ) : !questions.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("admin.systemSettings.followUps.empty")}
          </p>
        ) : (
          <table
            className="w-full min-w-[720px] table-fixed border-collapse text-sm"
            aria-busy={busy}
          >
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="pb-3 pr-4 font-bold">
                  {t("admin.systemSettings.colQuestion")}
                </th>
                <th
                  scope="col"
                  className="w-32 pb-3 pr-4 font-bold whitespace-nowrap"
                >
                  {t("admin.systemSettings.followUps.status")}
                </th>
                <th
                  scope="col"
                  className="w-20 pb-3 font-bold whitespace-nowrap"
                >
                  {t("admin.systemSettings.colActions")}
                </th>
              </tr>
            </thead>
            <tbody ref={tbodyRef} className={cn(draggingId && "select-none")}>
              {order.map((question, index) => (
                <tr
                  key={question.id}
                  data-sortable-id={question.id}
                  className={cn(
                    "border-b border-border last:border-0",
                    draggingId === question.id &&
                      "relative bg-primary/10 shadow-md",
                  )}
                >
                  <td className="py-4 pr-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={t("admin.systemSettings.reorderQuestion", {
                          n: index + 1,
                        })}
                        {...getHandleProps(question.id)}
                        className={cn(
                          "shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink focus-visible:bg-secondary focus-visible:text-ink disabled:cursor-wait disabled:opacity-50",
                          draggingId === question.id &&
                            "cursor-grabbing bg-secondary text-ink",
                        )}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <span className="w-6 shrink-0 font-data text-sm font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 break-words text-sm text-ink">
                        {question.text}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={
                        question.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {t(
                        `admin.systemSettings.followUps.${question.isActive ? "active" : "inactive"}`,
                      )}
                    </Badge>
                  </td>
                  <td className="py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <FollowUpDialog
                        question={question}
                        disabled={busy || !!draggingId}
                        onSaved={reload}
                      />
                      <DeleteFollowUpButton
                        question={question}
                        disabled={busy || !!draggingId}
                        onDeleted={reload}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
