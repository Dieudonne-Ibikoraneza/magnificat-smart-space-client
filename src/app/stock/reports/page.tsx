"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  Bot,
  PencilLine,
  RefreshCw,
  Scale,
} from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import {
  AnalyticsPeriodSwitcher,
  periodToRange,
  type AnalyticsPeriodDays,
} from "@/components/analytics-period-switcher";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { analyticsApi, reportsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { StockMovementType } from "@/lib/api/types";
import { cn, formatCompactCurrency, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const movementTone: Record<StockMovementType, string> = {
  INBOUND: "bg-primary/20 text-[#556500]",
  OUTBOUND: "bg-[#f1f3f2] text-ink",
  ADJUSTMENT: "bg-[#767961]/20 text-[#767961]",
};

const movementIcon: Record<StockMovementType, typeof ArrowDown> = {
  INBOUND: ArrowDown,
  OUTBOUND: ArrowUp,
  ADJUSTMENT: PencilLine,
};

const movementFilters = ["ALL", "INBOUND", "OUTBOUND", "ADJUSTMENT"] as const;
const movementFilterLabel: Record<(typeof movementFilters)[number], string> = {
  ALL: "All",
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
  ADJUSTMENT: "Adjustment",
};

const formatSignedSqm = (changeAreaSqm: number) =>
  `${changeAreaSqm > 0 ? "+" : changeAreaSqm < 0 ? "−" : ""}${Math.abs(changeAreaSqm).toLocaleString()} sqm`;

const RevenueTooltip = ({
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
      <p className="text-xs font-semibold tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-sm text-ink">Revenue: {payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const MovementSummaryCard = ({
  icon: Icon,
  label,
  value,
  valueTone = "text-ink",
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  value: ReactNode;
  valueTone?: string;
}) => (
  <div className="rounded-xl border border-[#edf0eb] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-ink">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <p className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</p>
    </div>
    <p className={cn("mt-3 text-2xl font-black tracking-tight", valueTone)}>{value}</p>
  </div>
);

const ReportChartSkeleton = () => (
  <div className="flex h-full items-end gap-2 px-4 pb-8 pt-4">
    {[35, 55, 42, 78, 62, 88, 48, 70, 58, 76, 45, 68].map((height, index) => (
      <Skeleton key={index} className="flex-1 rounded-t-sm rounded-b-none" style={{ height: `${height}%` }} />
    ))}
  </div>
);

const MovementTableSkeleton = () => (
  <div className="mt-6 space-y-4">
    {[0, 1, 2, 3, 4].map((row) => (
      <div key={row} className="flex items-center gap-5 border-b border-[#e7e8e7] px-3 pb-4">
        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

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

export default function StockReportsPage() {
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);
  const period = periodToRange[periodDays];
  const [movementFilter, setMovementFilter] = useState<(typeof movementFilters)[number]>("ALL");

  const sales = useApi(() => analyticsApi.sales(period), [period]);
  const recommendations = useApi(() => analyticsApi.tileRecommendations({ period }), [period]);
  const stockSummary = useApi(() => reportsApi.stockSummary(period), [period]);
  const journey = useApi(() => analyticsApi.journey(period), [period]);
  const movements = useApi(
    () =>
      reportsApi.stockMovements({
        period,
        type: movementFilter === "ALL" ? undefined : movementFilter,
        limit: 20,
      }),
    [period, movementFilter],
  );

  const chartData = useMemo(
    () => sales.data?.trend.map((point) => ({ day: point.label, value: point.value })) ?? [],
    [sales.data],
  );
  const adjustmentCount =
    stockSummary.data?.byType.find((row) => row.type === "ADJUSTMENT")?.movements ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1070px]">
      <StockPageHeader
        title="Reports"
        subtitle="Comprehensive analytics and performance metrics for the Magnificat ecosystem."
      >
        <AnalyticsPeriodSwitcher period={periodDays} onChange={setPeriodDays} />
      </StockPageHeader>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">Sales Overview</h2>
              <p className="text-sm text-muted">Revenue Performance</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-widest text-muted uppercase">Total Sales</p>
              <p className="text-4xl font-black text-ink sm:text-5xl">
                {sales.loading ? (
                  <Skeleton className="ml-auto mt-2 h-12 w-36" />
                ) : (
                  formatCompactCurrency(sales.data?.totalSales ?? 0)
                )}
              </p>
              {!sales.loading && sales.data && (
                <p
                  className={cn(
                    "mt-1 text-xs font-bold",
                    sales.data.percentChangeVsLastPeriod >= 0 ? "text-green-600" : "text-red-600",
                  )}
                >
                  {sales.data.percentChangeVsLastPeriod >= 0 ? "↗" : "↘"}{" "}
                  {sales.data.percentChangeVsLastPeriod >= 0 ? "+" : ""}
                  {sales.data.percentChangeVsLastPeriod.toFixed(1)}% vs last period
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
            {sales.loading ? (
              <ReportChartSkeleton />
            ) : sales.error ? (
              <ApiErrorState message={sales.error} onRetry={sales.reload} className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 24 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e6e9e6" />
                  <XAxis
                    dataKey="day"
                    angle={-40}
                    textAnchor="end"
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={44}
                    tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }}
                    tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 1_000_000}M`)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: "transparent" }} content={<RevenueTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="var(--chart-blue)"
                    barSize="70%"
                    radius={[2, 2, 0, 0]}
                    animationDuration={700}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="size-3 rounded-sm bg-chart-blue" />
            <span className="font-data text-sm text-data-ink">Sales Performance</span>
          </div>
        </section>
        <div className="grid items-start content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <section className="h-fit self-start rounded-[14px] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Bot className="size-6 text-ink" />
              <h2 className="text-xl font-bold text-ink">AI Design Assistant</h2>
            </div>
            {recommendations.error ? (
              <ApiErrorState message={recommendations.error} onRetry={recommendations.reload} className="mt-5" />
            ) : (
              <div className="mt-7 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted">Recommendation Acceptance</p>
                  <p className="mt-2 text-4xl font-black text-ink">
                    {recommendations.loading
                      ? <Skeleton className="mt-2 h-11 w-24" />
                      : `${recommendations.data!.summary.acceptanceRate.toFixed(0)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted">Avg. Match Score</p>
                  <p className="mt-2 text-4xl font-black text-ink">
                    {recommendations.loading ? (
                      <Skeleton className="mt-2 h-11 w-24" />
                    ) : (
                      <>
                        {recommendations.data!.summary.averageMatchScore.toFixed(1)}
                        <span className="text-base text-muted">/5</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
          <section className="h-fit self-start rounded-[14px] bg-linear-to-br from-ink to-[#304f3f] p-7 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase">Repeat Purchase Rate</p>
              <RefreshCw className="size-7 text-primary" />
            </div>
            <p className="mt-2 text-5xl font-black text-primary">
              {sales.loading ? <Skeleton className="mt-2 h-14 w-28 bg-primary/30" /> : `${(sales.data?.repeatPurchaseRate ?? 0).toFixed(0)}%`}
            </p>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">Stock Movements</h2>
            <p className="text-sm text-muted">
              Inbound, outbound and adjustment activity across the warehouse.
            </p>
          </div>
          <div className="flex h-9 items-center gap-1 rounded-lg border border-[#edf0eb] bg-white p-1 shadow-sm">
            {movementFilters.map((filter) => (
              <Button
                key={filter}
                type="button"
                variant="ghost"
                onClick={() => setMovementFilter(filter)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[11px] font-bold tracking-wide",
                  movementFilter === filter
                    ? "bg-ink text-primary hover:bg-ink/80 hover:text-primary/80"
                    : "text-[#514c4d] hover:bg-[#f5f5f5]",
                )}
              >
                {movementFilterLabel[filter]}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MovementSummaryCard
            icon={ArrowDownToLine}
            label="Total Inbound"
            value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-24" /> : `+${(stockSummary.data?.totalInbound ?? 0).toLocaleString()} sqm`}
            valueTone="text-[#556500]"
          />
          <MovementSummaryCard
            icon={ArrowUpFromLine}
            label="Total Outbound"
            value={
                stockSummary.loading
                ? <Skeleton className="mt-3 h-8 w-24" />
                : `−${Math.abs(stockSummary.data?.totalOutbound ?? 0).toLocaleString()} sqm`
            }
          />
          <MovementSummaryCard
            icon={PencilLine}
            label="Adjustments"
            value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-16" /> : adjustmentCount.toString()}
          />
          <MovementSummaryCard
            icon={Scale}
            label="Net Change"
            value={
                stockSummary.loading
                ? <Skeleton className="mt-3 h-8 w-24" />
                : `${(stockSummary.data?.netChange ?? 0) >= 0 ? "+" : "−"}${Math.abs(stockSummary.data?.netChange ?? 0).toLocaleString()} sqm`
            }
            valueTone={(stockSummary.data?.netChange ?? 0) >= 0 ? "text-[#556500]" : "text-red-600"}
          />
        </div>

        {movements.loading ? (
          <MovementTableSkeleton />
        ) : movements.error ? (
          <ApiErrorState message={movements.error} onRetry={movements.reload} className="mt-6" />
        ) : (movements.data?.items.length ?? 0) === 0 ? (
          <ApiEmptyState message="No movements for this filter." className="mt-6" />
        ) : (
          <>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <Table className="min-w-160">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty (sqm)</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.data!.items.map((movement) => {
                    const Icon = movementIcon[movement.type];
                    return (
                      <TableRow key={movement.id} className="hover:bg-secondary/40">
                        <TableCell>
                          <p className="text-sm font-bold text-ink">{movement.product.name}</p>
                          <p className="mt-1 text-xs font-medium text-ink">
                            {movement.reference ?? movement.product.sku}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                              movementTone[movement.type],
                            )}
                          >
                            <Icon className="size-3.5" />
                            {movement.type}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn("font-data", movement.changeAreaSqm < 0 ? "text-red-600" : "text-ink")}
                        >
                          {formatSignedSqm(movement.changeAreaSqm)}
                        </TableCell>
                        <TableCell className="text-xs text-[#71809a]">
                          {movement.adjustedBy?.fullName ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-[#71809a]">
                          {formatRelativeTime(movement.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <ul className="mt-4 divide-y divide-[#e7e8e7] md:hidden">
              {movements.data!.items.map((movement) => {
                const Icon = movementIcon[movement.type];
                return (
                  <li key={movement.id} className="flex items-start justify-between gap-3 py-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">{movement.product.name}</p>
                      <p className="mt-1 text-xs text-[#71809a]">
                        {movement.reference ?? movement.product.sku} •{" "}
                        {movement.adjustedBy?.fullName ?? "—"} • {formatRelativeTime(movement.createdAt)}
                      </p>
                      <span
                        className={cn(
                          "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                          movementTone[movement.type],
                        )}
                      >
                        <Icon className="size-3.5" />
                        {movement.type}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-data text-sm font-semibold",
                        movement.changeAreaSqm < 0 ? "text-red-600" : "text-ink",
                      )}
                    >
                      {formatSignedSqm(movement.changeAreaSqm)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <div className="mt-6">
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
