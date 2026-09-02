"use client";

import { useState, type ReactElement, type ReactNode } from "react";
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
        toast.success("Question updated", { description: "Changes are live for new sessions." });
      } else {
        await settingsApi.createProfilingQuestion({
          text: text.trim(),
          isRequired,
          roomType: roomType ?? undefined,
        });
        toast.success("Question added");
      }
      onSaved();
      setOpen(false);
    } catch (cause) {
      toast.error(question ? "Couldn't save changes" : "Couldn't add question", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
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
          <DialogTitle>{question ? "Edit question" : "Add profiling question"}</DialogTitle>
          <DialogDescription>Shown to customers during AI-assisted room profiling.</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="question-text">Question</FieldLabel>
            <Textarea id="question-text" rows={2} value={text} onChange={(event) => setText(event.target.value)} />
            {text.length > 0 && !valid && (
              <p className="text-xs font-medium text-red-600">Enter at least 5 characters.</p>
            )}
          </Field>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Required</p>
              <p className="text-xs text-muted-foreground">Always asked, not skippable.</p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} aria-label="Toggle required" />
          </div>

          <div>
            <FieldLabel className="text-sm font-medium text-ink">Ask only for</FieldLabel>
            <p className="mt-0.5 text-xs text-muted-foreground">Leave on &quot;Every room&quot; to ask it regardless of room type.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setRoomType(null)} aria-pressed={roomType === null} className={pillClass(roomType === null)}>
                {roomType === null && <Check className="size-3.5" />}
                Every room
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
                  {roomTypeLabels[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            Cancel
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={() => void handleSubmit()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteQuestionButton = ({ question, onDeleted }: { question: ProfilingQuestion; onDeleted: () => void }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await settingsApi.deleteProfilingQuestion(question.id);
      toast.success("Question removed");
      onDeleted();
    } catch (cause) {
      toast.error("Couldn't remove question", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      trigger={
        <button type="button" disabled={deleting} aria-label={`Delete question`} className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="size-4" />
        </button>
      }
      title="Remove this question?"
      description="It stops being asked to new customers. Past answers stay intact."
      confirmLabel="Remove question"
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
  const requiredCount = questions.filter((question) => question.isRequired && !question.roomType).length;
  const conditionalCount = questions.filter((question) => question.roomType).length;

  const stats = [
    { label: "Questions Used", value: questions.length, icon: MessageSquareWarning },
    { label: "Required Questions", value: requiredCount, icon: MessageSquareWarning },
    { label: "Conditional Questions", value: conditionalCount, icon: ListChecks },
  ];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-ink">
            <Lightbulb className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">AI Recommendations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage AI recommendation logic and customer profiling questions.
            </p>
          </div>
        </div>
        <QuestionDialog
          onSaved={onChanged}
          trigger={<Button type="button" variant="outline" className="h-10 shrink-0 gap-2 border-border text-ink" />}
        >
          <Plus className="size-4" /> Add Question
        </QuestionDialog>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-xl border border-border p-5">
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
                <th className="pb-3 pr-4 font-bold">Question</th>
                <th className="pb-3 pr-4 font-bold whitespace-nowrap">Status/Condition</th>
                <th className="pb-3 font-bold whitespace-nowrap">Actions</th>
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
                            ? roomTypeLabels[question.roomType]
                            : question.isRequired
                              ? "Required"
                              : "Optional"}
                        </Badge>
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label={`Preview question ${index + 1}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                            <Eye className="size-4" />
                          </button>
                          <QuestionDialog
                            question={question}
                            onSaved={onChanged}
                            trigger={<button type="button" aria-label={`Edit question ${index + 1}`} className="rounded-md p-1.5 text-ink hover:bg-secondary" />}
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
      toast.error("Invalid low stock threshold", { description: "Enter a number of 0 or more." });
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
      toast.success("Settings saved");
      reloadSettings();
    } catch (cause) {
      toast.error("Couldn't save settings", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const platformInfo = settings
    ? [
        { label: "Platform Name", value: String(settings["platform.name"]) },
        { label: "Default Currency", value: `${String(settings["platform.defaultCurrency"])} (Rwandan Franc)` },
        { label: "System Version", value: String(settings["platform.version"]) },
      ]
    : [];

  return (
    <>
      <AdminPageHeader
        title="System Settings"
        subtitle="Configure core platform settings and preferences."
      >
        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            className="h-11 gap-2 px-5 text-sm font-bold"
            disabled={!pendingValuesReady || saving}
            onClick={() => void handleSaveAll()}
          >
            <Save className="size-[18px]" /> {saving ? "Saving…" : "Save All Changes"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Loading…"}
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
            <h2 className="text-lg font-bold text-ink">Inventory Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage stock-related preferences</p>

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
                    <p className="text-sm font-semibold text-ink">Low Stock Notifications</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Alert when items fall below threshold</p>
                  </div>
                  <Switch
                    checked={lowStockAlerts ?? true}
                    onCheckedChange={setLowStockAlerts}
                    aria-label="Toggle low stock notifications"
                  />
                </div>

                <div className="mt-5 border-t border-border pt-5">
                  <label className="block text-sm font-semibold text-ink">
                    Low Stock Threshold
                    <div className="mt-2 flex items-center overflow-hidden rounded-lg border border-input">
                      <Input
                        type="number"
                        min={0}
                        value={lowStockThreshold ?? ""}
                        onChange={(event) => setLowStockThreshold(event.target.value)}
                        className="h-11 rounded-none border-0 text-sm"
                      />
                      <span className="shrink-0 px-3 text-sm text-muted-foreground">sqm</span>
                    </div>
                  </label>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-ink" />
              <h2 className="text-lg font-bold text-ink">Notifications</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Manage system notification preferences</p>

            {settingsError ? null : settingsLoading && !pendingValuesReady ? (
              <div className="mt-2 space-y-4 divide-y divide-border">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="mt-2 divide-y divide-border">
                <div className="flex items-center justify-between gap-4 py-4">
                  <p className="text-sm font-semibold text-ink">Order Updates</p>
                  <Switch checked={orderUpdates ?? true} onCheckedChange={setOrderUpdates} aria-label="Toggle order updates" />
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <p className="text-sm font-semibold text-ink">System Notifications</p>
                  <Switch
                    checked={systemNotifications ?? true}
                    onCheckedChange={setSystemNotifications}
                    aria-label="Toggle system notifications"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-3">
          {(settingsLoading && !settings ? Array.from({ length: 3 }, () => null) : platformInfo).map((item, index) =>
            item ? (
              <div key={item.label}>
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
