"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Check,
  Eye,
  GripVertical,
  ListChecks,
  Lightbulb,
  MessageSquareWarning,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiErrorState } from "@/components/api-state";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { settingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { roomTypeLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import type { ProfilingQuestion, RoomType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const roomTypeOptions = Object.keys(roomTypeLabels) as RoomType[];
const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

const pillClass = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "border-primary bg-primary text-ink"
      : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
  );

/** Shared create/edit form — a profiling question is either always asked (`roomType: null`) or only asked for one room. */
const QuestionDialog = ({
  question,
  trigger,
  children,
  onSaved,
}: {
  /** Omit for create mode. */
  question?: ProfilingQuestion;
  trigger: ReactElement;
  children: ReactNode;
  onSaved: () => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(question?.text ?? "");
  const [isRequired, setIsRequired] = useState(question?.isRequired ?? true);
  const [roomType, setRoomType] = useState<RoomType | null>(question?.roomType ?? null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setText(question?.text ?? "");
    setIsRequired(question?.isRequired ?? true);
    setRoomType(question?.roomType ?? null);
  };

  const valid = text.trim().length >= 5;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      if (question) {
        await settingsApi.updateProfilingQuestion(question.id, {
          text: text.trim(),
          isRequired,
          roomType,
        });
        toast.success(t("admin.systemSettings.toastQuestionUpdated"), { description: t("admin.systemSettings.toastQuestionUpdatedDesc") });
      } else {
        await settingsApi.createProfilingQuestion({
          text: text.trim(),
          isRequired,
          roomType: roomType ?? undefined,
        });
        toast.success(t("admin.systemSettings.toastQuestionAdded"));
      }
      onSaved();
      setOpen(false);
    } catch (cause) {
      toast.error(question ? t("admin.systemSettings.toastSaveFailedEdit") : t("admin.systemSettings.toastSaveFailedAdd"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{question ? t("admin.systemSettings.dialogEditTitle") : t("admin.systemSettings.dialogAddTitle")}</DialogTitle>
          <DialogDescription>{t("admin.systemSettings.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="question-text">{t("admin.systemSettings.dialogQuestionLabel")}</FieldLabel>
            <Textarea id="question-text" rows={2} value={text} onChange={(event) => setText(event.target.value)} />
            {text.length > 0 && !valid && (
              <p className="text-xs font-medium text-red-600">{t("admin.systemSettings.dialogMinChars")}</p>
            )}
          </Field>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{t("admin.systemSettings.dialogRequired")}</p>
              <p className="text-xs text-muted-foreground">{t("admin.systemSettings.dialogRequiredSub")}</p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} aria-label={t("admin.systemSettings.dialogToggleRequired")} />
          </div>

          <div>
            <FieldLabel className="text-sm font-medium text-ink">{t("admin.systemSettings.dialogAskOnlyFor")}</FieldLabel>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.systemSettings.dialogEveryRoomHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setRoomType(null)} aria-pressed={roomType === null} className={pillClass(roomType === null)}>
                {roomType === null && <Check className="size-3.5" />}
                {t("admin.systemSettings.dialogEveryRoom")}
              </button>
              {roomTypeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRoomType(option)}
                  aria-pressed={roomType === option}
                  className={pillClass(roomType === option)}
                >
                  {roomType === option && <Check className="size-3.5" />}
                  {t(ROOM_TYPE_KEYS[option])}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            {t("admin.systemSettings.dialogCancel")}
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={() => void handleSubmit()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
            {submitting ? t("admin.systemSettings.dialogSaving") : t("admin.systemSettings.dialogSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteQuestionButton = ({ question, onDeleted }: { question: ProfilingQuestion; onDeleted: () => void }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await settingsApi.deleteProfilingQuestion(question.id);
      toast.success(t("admin.systemSettings.toastQuestionRemoved"));
      onDeleted();
    } catch (cause) {
      toast.error(t("admin.systemSettings.toastRemoveFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      trigger={
        <button type="button" disabled={deleting} aria-label={t("admin.systemSettings.deleteQuestion")} className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="size-4" />
        </button>
      }
      title={t("admin.systemSettings.deleteDialogTitle")}
      description={t("admin.systemSettings.deleteDialogDescription")}
      confirmLabel={t("admin.systemSettings.deleteDialogConfirm")}
      onConfirm={() => void handleDelete()}
    />
  );
};

const AiRecommendations = ({
  questions,
  loading,
  error,
  onRetry,
  onChanged,
}: {
  questions: ProfilingQuestion[];
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
  onChanged: () => void;
}) => {
  const { t } = useTranslation();
  const requiredCount = questions.filter((question) => question.isRequired && !question.roomType).length;
  const conditionalCount = questions.filter((question) => question.roomType).length;

  const stats = [
    { key: "used", label: t("admin.systemSettings.statQuestionsUsed"), value: questions.length, icon: MessageSquareWarning },
    { key: "required", label: t("admin.systemSettings.statRequiredQuestions"), value: requiredCount, icon: MessageSquareWarning },
    { key: "conditional", label: t("admin.systemSettings.statConditionalQuestions"), value: conditionalCount, icon: ListChecks },
  ];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-ink">
            <Lightbulb className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">{t("admin.systemSettings.aiRecommendations")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.systemSettings.aiRecommendationsSub")}
            </p>
          </div>
        </div>
        <QuestionDialog
          onSaved={onChanged}
          trigger={<Button type="button" variant="outline" className="h-10 shrink-0 gap-2 border-border text-ink" />}
        >
          <Plus className="size-4" /> {t("admin.systemSettings.addQuestion")}
        </QuestionDialog>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.key} className="rounded-xl border border-border p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted-background text-ink">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-3xl font-black text-ink">{loading ? "—" : stat.value}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        {error ? (
          <ApiErrorState message={error} onRetry={onRetry} />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                <th className="pb-3 pr-4 font-bold">{t("admin.systemSettings.colQuestion")}</th>
                <th className="pb-3 pr-4 font-bold whitespace-nowrap">{t("admin.systemSettings.colStatusCondition")}</th>
                <th className="pb-3 font-bold whitespace-nowrap">{t("admin.systemSettings.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && questions.length === 0
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td colSpan={3} className="py-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : questions.map((question, index) => (
                    <tr key={question.id} className="border-b border-border last:border-0">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                          <span className="w-6 shrink-0 font-data text-sm font-semibold text-muted-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className={cn("text-sm text-ink", question.roomType && "flex items-center gap-1.5")}>
                            {question.roomType && <span className="text-muted-foreground">↳</span>}
                            {question.text}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <Badge variant={!question.roomType && question.isRequired ? "default" : "outline"}>
                          {question.roomType
                            ? t(ROOM_TYPE_KEYS[question.roomType])
                            : question.isRequired
                              ? t("admin.systemSettings.required")
                              : t("admin.systemSettings.optional")}
                        </Badge>
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label={t("admin.systemSettings.previewQuestion", { n: index + 1 })} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                            <Eye className="size-4" />
                          </button>
                          <QuestionDialog
                            question={question}
                            onSaved={onChanged}
                            trigger={<button type="button" aria-label={t("admin.systemSettings.editQuestion", { n: index + 1 })} className="rounded-md p-1.5 text-ink hover:bg-secondary" />}
                          >
                            <Wrench className="size-4" />
                          </QuestionDialog>
                          <DeleteQuestionButton question={question} onDeleted={onChanged} />
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

const AdminSettingsPage = () => {
  const { t } = useTranslation();
  const { data: settings, loading: settingsLoading, error: settingsError, reload: reloadSettings } = useApi(() => settingsApi.get());
  const { data: questionsData, loading: questionsLoading, error: questionsError, reload: reloadQuestions } = useApi(
    () => settingsApi.profilingQuestions(),
  );

  const [lowStockAlerts, setLowStockAlerts] = useState<boolean | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<string | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<boolean | null>(null);
  const [systemNotifications, setSystemNotifications] = useState<boolean | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed local editable state once, the first time settings arrive — set
  // during render (React's documented pattern for this) rather than in an
  // effect, so a background refetch doesn't clobber an in-progress edit and
  // there's no extra commit. Guarded by `lowStockAlerts === null` so it only
  // ever runs on that first arrival.
  if (settings && lowStockAlerts === null) {
    setLowStockAlerts(Boolean(settings["notifications.lowStockAlerts"]));
    setLowStockThreshold(String(settings["stock.lowStockThreshold"]));
    setOrderUpdates(Boolean(settings["notifications.orderUpdates"]));
    setSystemNotifications(Boolean(settings["notifications.systemNotifications"]));
    setLastSyncedAt(new Date());
  }

  const pendingValuesReady =
    lowStockAlerts !== null && lowStockThreshold !== null && orderUpdates !== null && systemNotifications !== null;

  const handleSaveAll = async () => {
    if (!pendingValuesReady) return;
    const parsedThreshold = Number(lowStockThreshold);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      toast.error(t("admin.systemSettings.invalidThreshold"), { description: t("admin.systemSettings.invalidThresholdDesc") });
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update({
        "notifications.lowStockAlerts": lowStockAlerts,
        "stock.lowStockThreshold": parsedThreshold,
        "notifications.orderUpdates": orderUpdates,
        "notifications.systemNotifications": systemNotifications,
      });
      setLastSyncedAt(new Date());
      toast.success(t("admin.systemSettings.settingsSaved"));
      reloadSettings();
    } catch (cause) {
      toast.error(t("admin.systemSettings.settingsSaveFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  const platformInfo = settings
    ? [
        { key: "name", label: t("admin.systemSettings.platformName"), value: String(settings["platform.name"]) },
        { key: "currency", label: t("admin.systemSettings.defaultCurrency"), value: t("admin.systemSettings.defaultCurrencyValue", { code: String(settings["platform.defaultCurrency"]) }) },
        { key: "version", label: t("admin.systemSettings.systemVersion"), value: String(settings["platform.version"]) },
      ]
    : [];

  return (
    <>
      <AdminPageHeader
        title={t("admin.systemSettings.title")}
        subtitle={t("admin.systemSettings.subtitle")}
      >
        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            className="h-11 gap-2 px-5 text-sm font-bold"
            disabled={!pendingValuesReady || saving}
            onClick={() => void handleSaveAll()}
          >
            <Save className="size-[18px]" /> {saving ? t("admin.systemSettings.saving") : t("admin.systemSettings.saveAllChanges")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {lastSyncedAt ? t("admin.systemSettings.lastSynced", { time: lastSyncedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }) : t("staff.loading")}
          </p>
        </div>
      </AdminPageHeader>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <AiRecommendations
          questions={questionsData ?? []}
          loading={questionsLoading}
          error={questionsError}
          onRetry={reloadQuestions}
          onChanged={reloadQuestions}
        />

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t("admin.systemSettings.inventorySettings")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.systemSettings.inventorySettingsSub")}</p>

            {settingsError ? (
              <ApiErrorState message={settingsError} onRetry={reloadSettings} className="mt-5" />
            ) : settingsLoading && !pendingValuesReady ? (
              <>
                <Skeleton className="mt-5 h-14 w-full" />
                <Skeleton className="mt-5 h-14 w-full" />
              </>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t("admin.systemSettings.lowStockNotifications")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.systemSettings.lowStockNotificationsSub")}</p>
                  </div>
                  <Switch
                    checked={lowStockAlerts ?? true}
                    onCheckedChange={setLowStockAlerts}
                    aria-label={t("admin.systemSettings.toggleLowStock")}
                  />
                </div>

                <div className="mt-5 border-t border-border pt-5">
                  <label className="block text-sm font-semibold text-ink">
                    {t("admin.systemSettings.lowStockThreshold")}
                    <div className="mt-2 flex items-center overflow-hidden rounded-lg border border-input">
                      <Input
                        type="number"
                        min={0}
                        value={lowStockThreshold ?? ""}
                        onChange={(event) => setLowStockThreshold(event.target.value)}
                        className="h-11 rounded-none border-0 text-sm"
                      />
                      <span className="shrink-0 px-3 text-sm text-muted-foreground">{t("analytics.common.sqm")}</span>
                    </div>
                  </label>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-ink" />
              <h2 className="text-lg font-bold text-ink">{t("admin.systemSettings.notifications")}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.systemSettings.notificationsSub")}</p>

            {settingsError ? null : settingsLoading && !pendingValuesReady ? (
              <div className="mt-2 space-y-4 divide-y divide-border">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="mt-2 divide-y divide-border">
                <div className="flex items-center justify-between gap-4 py-4">
                  <p className="text-sm font-semibold text-ink">{t("admin.systemSettings.orderUpdates")}</p>
                  <Switch checked={orderUpdates ?? true} onCheckedChange={setOrderUpdates} aria-label={t("admin.systemSettings.toggleOrderUpdates")} />
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <p className="text-sm font-semibold text-ink">{t("admin.systemSettings.systemNotifications")}</p>
                  <Switch
                    checked={systemNotifications ?? true}
                    onCheckedChange={setSystemNotifications}
                    aria-label={t("admin.systemSettings.toggleSystemNotifications")}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-3">
          {(settingsLoading && !settings ? Array.from({ length: 3 }, () => null) : platformInfo).map((item, index) =>
            item ? (
              <div key={item.key}>
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{item.value}</p>
              </div>
            ) : (
              <Skeleton key={index} className="h-10 w-full" />
            ),
          )}
        </div>
      </div>
    </>
  );
};

export default AdminSettingsPage;
