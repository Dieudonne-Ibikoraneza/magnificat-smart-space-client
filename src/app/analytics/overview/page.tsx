"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Coins, CircleCheckBig, ExternalLink, Repeat2, UsersRound } from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { ConversionFunnel, type ConversionFunnelStage } from "@/components/conversion-funnel";
import { KpiCards, type KpiCardData } from "@/components/kpi-cards";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi, usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { formatCompactCurrency, formatCompactNumber, getInitials } from "@/lib/utils";

const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const KpiSkeleton = () => (
  <article className="rounded-2xl bg-card p-5 sm:p-6">
    <Skeleton className="size-5" />
    <Skeleton className="mt-6 h-3 w-24" />
    <Skeleton className="mt-2 h-8 w-16" />
  </article>
);

const RecommendationsTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <p className="mt-1 font-data text-sm text-ink">{payload[0].value.toLocaleString()} shown</p>
    </div>
  );
};

/** Recommendations displayed per bucket — `TileRecommendations.summary.trend` — the only real day-by-day series this endpoint has (no per-day acceptance/match-score breakdown exists). */
const RecommendationsTrendChart = ({ data }: { data: { day: string; value: number }[] }) => (
  <div className="h-48 w-full font-data">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 24 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
        <XAxis dataKey="day" angle={-40} textAnchor="end" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={ChartAxisTick} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={ChartAxisTick} />
        <Tooltip cursor={{ fill: "transparent" }} content={<RecommendationsTooltip />} />
        <Bar dataKey="value" barSize="70%" radius={[2, 2, 0, 0]} fill="var(--primary)" animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const AiRecommendationsPanel = ({
  totalRecommendations,
  acceptanceRate,
  averageMatchScore,
  trend,
}: {
  totalRecommendations: number;
  acceptanceRate: number;
  averageMatchScore: number;
  trend: { day: string; value: number }[];
}) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">AI Recommendations</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tile-matching performance this period</p>
      </div>
      <Link href="/analytics/ai" className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline">
        <ExternalLink className="size-3.5" /> View All
      </Link>
    </div>
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div>
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Recommendations</p>
        <p className="mt-2 text-2xl font-black text-ink">{totalRecommendations.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Acceptance Rate</p>
        <p className="mt-2 text-2xl font-black text-ink">{acceptanceRate.toFixed(0)}%</p>
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Avg. Match Score</p>
        <p className="mt-2 text-2xl font-black text-ink">{averageMatchScore.toFixed(0)}%</p>
      </div>
    </div>
    <div className="mt-6 border-t border-border pt-5">
      {totalRecommendations === 0 ? (
        <ApiEmptyState message="No AI recommendations shown in this period yet." className="py-6" />
      ) : (
        <RecommendationsTrendChart data={trend} />
      )}
    </div>
  </section>
);

const AnalyticsOverviewPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(7);
  const range = periodToRange[period];

  const { data: overview, loading: overviewLoading, error: overviewError, reload: reloadOverview } = useApi(
    () => analyticsApi.overview(range),
    [range],
  );
  // Fetches every product's stats for the period (well under the 100 cap)
  // and ranks by `viewed` client-side — the `table` rows already carry
  // collection/selectionRate, which the leaderboard alone doesn't.
  const { data: tiles, loading: tilesLoading } = useApi(() => analyticsApi.tiles({ period: range, limit: 100 }), [range]);
  const { data: recommendations, loading: recommendationsLoading } = useApi(
    () => analyticsApi.tileRecommendations({ period: range }),
    [range],
  );
  // `sort: "spend"` ranks server-side, so this asks for exactly the 5 rows
  // shown instead of over-fetching and sorting a page client-side.
  const { data: customersData, loading: customersLoading } = useApi(() => usersApi.listCustomers({ sort: "spend", limit: 5 }));

  const topTiles = useMemo(
    () => [...(tiles?.table.items ?? [])].sort((a, b) => b.viewed - a.viewed).slice(0, 5),
    [tiles],
  );
  const topCustomers = customersData?.items ?? [];

  const kpis: KpiCardData[] = overview
    ? [
        { label: "Total Sales (RWF)", value: formatCompactCurrency(overview.totalSales), icon: Coins },
        { label: "Total Customers", value: overview.totalCustomers.toLocaleString(), icon: UsersRound },
        { label: "Repeat Purchase Rate", value: `${overview.repeatPurchaseRate.toFixed(0)}%`, icon: Repeat2 },
        {
          label: "Recommendation Acceptance Rate",
          value: `${overview.recommendationAcceptanceRate.toFixed(0)}%`,
          icon: CircleCheckBig,
        },
      ]
    : [];

  const funnelStages: ConversionFunnelStage[] = useMemo(() => {
    if (!overview) return [];
    return overview.funnel.map((row, index) => {
      const previous = index === 0 ? null : overview.funnel[index - 1];
      return {
        stage: row.stage,
        customers: row.customers,
        conversionFromPrevious: previous ? (previous.customers > 0 ? Math.round((row.customers / previous.customers) * 100) : 0) : undefined,
      };
    });
  }, [overview]);

  return (
    <>
      <AnalyticsPageHeader
        title="Overview"
        subtitle="High-level performance metrics and trends across the Magnificat ecosystem."
      >
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AnalyticsPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {overviewError ? (
          <ApiErrorState message={overviewError} onRetry={reloadOverview} className="my-8" />
        ) : overviewLoading || !overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
        ) : (
          <KpiCards items={kpis} />
        )}

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          {overviewLoading || !overview ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Sales Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Revenue Performance</p>
              <Skeleton className="mt-6 h-65 w-full sm:mt-8 sm:h-80" />
            </section>
          ) : overview.revenueTrend.length === 0 ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Sales Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Revenue Performance</p>
              <ApiEmptyState message="No sales in this period yet." className="py-16" />
            </section>
          ) : (
            <RevenueTrendChart
              title="Sales Overview"
              subtitle="Revenue Performance"
              range={range}
              data={overview.revenueTrend.map((point) => ({ day: point.label, value: point.value }))}
            />
          )}

          {overviewLoading || !overview || recommendationsLoading || !recommendations ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : (
            <AiRecommendationsPanel
              totalRecommendations={overview.totalRecommendations}
              acceptanceRate={overview.recommendationAcceptanceRate}
              averageMatchScore={overview.averageMatchScore}
              trend={recommendations.summary.trend.map((point) => ({ day: point.label, value: point.value }))}
            />
          )}
        </div>

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Top Viewed Tiles</h2>
              <Link href="/analytics/tiles" className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline">
                <ExternalLink className="size-3.5" /> View All
              </Link>
            </div>
            {tilesLoading ? (
              <div className="mt-4 space-y-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="size-14 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topTiles.length === 0 ? (
              <ApiEmptyState message="No tile activity yet." className="py-10" />
            ) : (
              <ul className="mt-4">
                {topTiles.map((tile, index) => (
                  <li key={tile.productId} className={index > 0 ? "border-t border-border" : undefined}>
                    <Link href="/analytics/tiles" className="flex items-center gap-3 py-4 transition-colors hover:bg-secondary/40">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        {tile.image && <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{tile.collection}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink">{formatCompactNumber(tile.viewed)} views</p>
                        <p className="mt-0.5 text-xs font-semibold text-green-600">{tile.selectionRate.toFixed(1)}% selection</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Top Customers</h2>
              <Link href="/analytics/customers" className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline">
                <ExternalLink className="size-3.5" /> View All
              </Link>
            </div>
            {customersLoading ? (
              <div className="mt-4 space-y-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topCustomers.length === 0 ? (
              <ApiEmptyState message="No customers yet." className="py-10" />
            ) : (
              <ul className="mt-4">
                {topCustomers.map((customer, index) => (
                  <li key={customer.id} className={index > 0 ? "border-t border-border" : undefined}>
                    <div className="flex items-center gap-3 py-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {getInitials(customer.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{customer.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {customer.firstOrderAt && customer.lastOrderAt
                            ? customer.firstOrderAt === customer.lastOrderAt
                              ? formatShortDate(customer.firstOrderAt)
                              : `${formatShortDate(customer.firstOrderAt)} – ${formatShortDate(customer.lastOrderAt)}`
                            : "No orders yet"}
                        </p>
                      </div>
                      <span className="shrink-0 font-data text-sm font-semibold text-ink">
                        {formatCompactCurrency(customer.lifetimeSpend)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {overview && <ConversionFunnel stages={funnelStages} />}
      </div>
    </>
  );
};

export default AnalyticsOverviewPage;
