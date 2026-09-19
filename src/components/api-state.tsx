"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

/** Shown while an API-backed section is still loading. */
export const ApiLoading = ({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className={cn("flex items-center justify-center gap-2 py-16 text-sm text-muted", className)}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label ?? t("common.loading")}
    </div>
  );
};

/**
 * Shown when an API call fails. Always surfaces the server's own message rather
 * than a generic one, and offers a retry — a section that silently falls back to
 * stale or placeholder data hides a broken backend from whoever needs to fix it.
 */
export const ApiErrorState = ({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <CircleAlert className="size-5" />
      </span>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-1 h-10 px-5 text-sm font-bold">
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
};

/** Neutral state for a successful response that simply has nothing in it. */
export const ApiEmptyState = ({
  message,
  className,
}: {
  message: string;
  className?: string;
}) => (
  <p className={cn("rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm", className)}>
    {message}
  </p>
);

/**
 * What a role-gated layout shows until it knows who is signed in: the usual
 * loading state, or — when the session check itself failed (network down, API
 * error) — a retryable error. That case must not look like "signed out": the
 * session may be perfectly good, so `useRequireRole` doesn't redirect either.
 */
export const SessionPending = ({ label, className }: { label?: string; className?: string }) => {
  const { t } = useTranslation();
  const { error, refresh } = useCurrentUser();

  if (error) return <ApiErrorState message={t("common.sessionCheckFailed")} onRetry={refresh} className={className} />;
  return <ApiLoading label={label} className={className} />;
};
