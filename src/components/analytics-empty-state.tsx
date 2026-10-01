"use client";

import { ChartNoAxesCombined, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** An empty analytics section, rendered within its existing card. */
export const AnalyticsEmptyState = ({
  message,
  description,
  icon: Icon = ChartNoAxesCombined,
  className,
}: {
  message: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) => (
  <div
    role="status"
    className={cn(
      "flex min-h-48 flex-1 flex-col items-center justify-center px-4 py-8 text-center font-sans",
      className,
    )}
  >
    <span
      className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary/70 text-ink/50"
      aria-hidden="true"
    >
      <Icon className="size-7" strokeWidth={1.5} />
    </span>
    <p className="max-w-sm text-sm font-semibold text-ink">{message}</p>
    {description && (
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
    )}
  </div>
);
