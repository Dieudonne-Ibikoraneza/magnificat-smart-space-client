"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StockPageHeader } from "@/app/[lang]/stock/layout";
import {
  AnalyticsPeriodSwitcher,
  periodToRange,
  type AnalyticsPeriodDays,
} from "@/components/analytics-period-switcher";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { ApiErrorState } from "@/components/api-state";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { Skeleton } from "@/components/ui/skeleton";

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

/**
 * This page is deliberately just the Conversion Funnel — every other widget
 * that used to live here (Sales Overview, AI Assistant, Repeat Rate, Stock
 * Movements) was removed at the stock manager's own request; this is the
 * one report this role wants here.
 */
export default function StockReportsPage() {
  const { t } = useTranslation();
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);
  const period = periodToRange[periodDays];

  const journey = useApi(() => analyticsApi.journey(period), [period]);

  return (
    <div className="mx-auto w-full max-w-[1070px]">
      <StockPageHeader
        title={t("stock.reports.title")}
        subtitle={t("stock.reports.subtitle")}
      >
        <AnalyticsPeriodSwitcher period={periodDays} onChange={setPeriodDays} />
      </StockPageHeader>

      <div className="mt-7">
        {journey.loading ? (
          <FunnelSkeleton />
        ) : journey.error ? (
          <ApiErrorState message={journey.error} onRetry={journey.reload} className="rounded-[14px] shadow-sm" />
        ) : (
          <ConversionFunnel stages={journey.data?.stages} />
        )}
      </div>
    </div>
  );
}
