"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardPageHeader as StockPageHeader } from "@/components/dashboard-page-headers";
import {
  AnalyticsPeriodSwitcher,
  periodToRange,
  type AnalyticsPeriodDays,
} from "@/components/analytics-period-switcher";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { ApiErrorState } from "@/components/api-state";
import { StockReportView } from "@/components/stock-report-view";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { cn } from "@/lib/utils";

const FunnelSkeleton = () => (
  <div className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
    <Skeleton className="h-7 w-48" />
    <Skeleton className="mt-2 h-4 w-72" />
    <div className="mt-8 space-y-4">
      {[0, 1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
);

const tabs = ["stock", "funnel"] as const;
type ReportTab = (typeof tabs)[number];

/**
 * Reports for the stock manager: the stock report (summary, movement trend,
 * the full movement feed, low stock, the fulfilment queue — see
 * `StockReportView`, also shown to admin and the data analyst), plus the
 * conversion funnel, kept as its own tab per the stock manager's earlier
 * request. Sales/AI/repeat-rate figures deliberately stay out of this page;
 * they live under `/analytics/*`, which this role can also reach.
 */
export default function StockReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReportTab>("stock");
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);
  const period = periodToRange[periodDays];

  const journey = useApi(() => analyticsApi.journey(period), [period]);

  return (
    <div className="mx-auto w-full max-w-[1070px]">
      <StockPageHeader title={t("stock.reports.title")} subtitle={t("stock.reports.subtitle")}>
        <AnalyticsPeriodSwitcher period={periodDays} onChange={setPeriodDays} />
      </StockPageHeader>

      <div
        role="tablist"
        aria-label={t("stock.reports.tabsAria")}
        className="mt-6 inline-flex h-11 items-center gap-1 rounded-xl border border-[#edf0eb] bg-white p-1 shadow-sm"
      >
        {tabs.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-9 rounded-lg px-4 text-sm font-bold transition-colors",
              tab === value ? "bg-ink text-primary" : "text-[#514c4d] hover:bg-[#f5f5f5]",
            )}
          >
            {value === "funnel" ? t("staff.conversionFunnel.title") : t("stock.reports.tabStockReport")}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "funnel" ? (
          journey.loading ? (
            <FunnelSkeleton />
          ) : journey.error ? (
            <ApiErrorState message={journey.error} onRetry={journey.reload} className="rounded-[14px] shadow-sm" />
          ) : (
            <ConversionFunnel stages={journey.data?.stages ?? []} />
          )
        ) : (
          <StockReportView area="stock" period={period} />
        )}
      </div>
    </div>
  );
}
