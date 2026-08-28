"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown while an API-backed section is still loading. */
export const ApiLoading = ({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div
    role="status"
    className={cn("flex items-center justify-center gap-2 py-16 text-sm text-muted", className)}
  >
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    {label}
  </div>
);

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
}) => (
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
        Try again
      </Button>
    )}
  </div>
);

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
