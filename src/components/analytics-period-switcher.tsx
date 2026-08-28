"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export const analyticsPeriods = [
  [7, "7 DAYS"],
  [30, "30 DAYS"],
  [12, "12 MONTHS"],
] as const;

export type AnalyticsPeriodDays = (typeof analyticsPeriods)[number][0];
export type AnalyticsRange = "WEEKLY" | "MONTHLY" | "YEARLY";

export const periodToRange: Record<AnalyticsPeriodDays, AnalyticsRange> = {
  7: "WEEKLY",
  30: "MONTHLY",
  12: "YEARLY",
};

/**
 * Page-header period switcher (7 DAYS / 30 DAYS / 12 MONTHS), matching the
 * pattern first used on stock/reports. Drop into a `*PageHeader`'s children
 * and drive any period-aware chart on the page from the same `period` state.
 */
export const AnalyticsPeriodSwitcher = ({
  period,
  onChange,
}: {
  period: AnalyticsPeriodDays;
  onChange: (value: AnalyticsPeriodDays) => void;
}) => (
  <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[#edf0eb] bg-white p-1 shadow-sm">
    {analyticsPeriods.map(([value]) => (
      <Button
        key={value}
        type="button"
        variant="ghost"
        onClick={() => onChange(value)}
        className={`h-9 min-w-14 rounded-lg px-2 text-[10px] font-bold leading-3 tracking-wide transition-colors sm:min-w-18 ${period === value ? "bg-ink text-primary hover:bg-ink/80 hover:text-primary/80" : "text-[#514c4d] hover:bg-[#f5f5f5]"}`}
      >
        <span>
          {value === 12 ? (
            <>
              12
              <br />
              MONTHS
            </>
          ) : (
            <>
              {value}
              <br />
              DAYS
            </>
          )}
        </span>
      </Button>
    ))}
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="ml-1 h-8 w-10 cursor-default rounded-none border-0 border-l border-border pl-2 text-[#514c4d] hover:bg-transparent hover:text-[#514c4d] focus-visible:ring-0"
    >
      <CalendarDays className="size-5" />
    </Button>
  </div>
);
