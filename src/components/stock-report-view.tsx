"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  Boxes,
  ChevronRight,
  Clock3,
  PackageX,
  PencilLine,
  Scale,
  ShelvingUnit,
  WalletCards,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-headers";
import {
  AnalyticsPeriodSwitcher,
  periodToRange,
  type AnalyticsPeriodDays,
  type AnalyticsRange,
} from "@/components/analytics-period-switcher";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
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
import { ListPagination } from "@/components/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { reportsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { StockMovementType, StockStatus } from "@/lib/api/types";
import { cn, formatCompactCurrency, formatRelativeTime } from "@/lib/utils";

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
const MOVEMENT_FILTER_KEYS: Record<(typeof movementFilters)[number], string> = {
  ALL: "stock.reports.filterAll",
  INBOUND: "stock.reports.filterInbound",
  OUTBOUND: "stock.reports.filterOutbound",
  ADJUSTMENT: "stock.reports.filterAdjustment",
};

const STOCK_STATUS_KEYS: Record<StockStatus, string> = {
  in_stock: "product.stock.in_stock",
  low_stock: "product.stock.low_stock",
  out_of_stock: "product.stock.out_of_stock",
};

const MOVEMENTS_PAGE_SIZE = 10;

const formatSignedSqm = (changeAreaSqm: number) =>
  `${changeAreaSqm > 0 ? "+" : changeAreaSqm < 0 ? "−" : ""}${Math.abs(changeAreaSqm).toLocaleString()} sqm`;

/** A symmetric 5-tick axis around zero, sized to whatever the real (signed) data is — the trend can dip negative in a period with more outbound than inbound. */
const signedAxisFor = (values: number[]) => {
  const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value)));
  const step = Math.max(1, Math.ceil(maxAbs / 2));
  const bound = step * 2;
  return { yTicks: [-bound, -step, 0, step, bound], yDomain: [-bound, bound] as [number, number] };
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  valueTone = "text-ink",
}: {
  icon: typeof WalletCards;
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
    <div className={cn("mt-3 text-2xl font-black tracking-tight", valueTone)}>{value}</div>
  </div>
);

const TrendTooltip = ({
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
      <p className={cn("mt-1 font-data text-sm", payload[0].value < 0 ? "text-red-600" : "text-ink")}>
        {formatSignedSqm(payload[0].value)}
      </p>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="flex h-full items-end gap-2 px-4 pb-8 pt-4">
    {[35, 55, 42, 78, 62, 88, 48, 70, 58, 76, 45, 68].map((height, index) => (
      <Skeleton key={index} className="flex-1 rounded-t-sm rounded-b-none" style={{ height: `${height}%` }} />
    ))}
  </div>
);

const TableRowsSkeleton = () => (
  <div className="mt-6 space-y-4">
    {[0, 1, 2, 3, 4].map((row) => (
      <div key={row} className="flex items-center gap-5 border-b border-[#e7e8e7] px-3 pb-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
);

/**
 * Which dashboard is showing the report. The backend serves the stock reports
 * to the stock manager, admin and data analyst alike; each area links order
 * rows to its own order page (routes are gated per role, see
 * `auth-routes.ts`), and the data analyst gets a read-only view — adjusting
 * stock is for stock managers and admins.
 */
export type StockReportArea = "stock" | "admin" | "analytics";

const ORDER_HREF: Record<StockReportArea, (orderId: string) => string> = {
  stock: (id) => `/stock/orders/${id}`,
  admin: (id) => `/admin/orders/${id}`,
  analytics: (id) => `/analytics/orders/${id}`,
};

/**
 * The stock report itself — summary + net-movement trend, the full paginated
 * movement feed, low stock, and the fulfilment queue — for a period the
 * caller owns (so its switcher can live in the page header).
 */
export const StockReportView = ({ area, period }: { area: StockReportArea; period: AnalyticsRange }) => {
  const { t } = useTranslation();
  const orderHref = ORDER_HREF[area];
  const canAdjust = area !== "analytics";
  const [movementFilter, setMovementFilter] = useState<(typeof movementFilters)[number]>("ALL");
  const [movementsPage, setMovementsPage] = useState(1);

  // A different period is a different result set — back to page 1. Derived
  // during render (React's own pattern for this) rather than in an effect, so
  // the movements request never fires for a stale page of the new period.
  const [trackedPeriod, setTrackedPeriod] = useState(period);
  if (trackedPeriod !== period) {
    setTrackedPeriod(period);
    setMovementsPage(1);
  }

  const stockSummary = useApi(() => reportsApi.stockSummary(period), [period]);
  const lowStock = useApi(() => reportsApi.lowStock());
  const fulfillment = useApi(() => reportsApi.fulfillmentQueue());
  const movements = useApi(
    () =>
      reportsApi.stockMovements({
        period,
        type: movementFilter === "ALL" ? undefined : movementFilter,
        page: movementsPage,
        limit: MOVEMENTS_PAGE_SIZE,
      }),
    [period, movementFilter, movementsPage],
  );

  const changeMovementFilter = (filter: (typeof movementFilters)[number]) => {
    setMovementFilter(filter);
    setMovementsPage(1);
  };

  const trendData = useMemo(
    () => stockSummary.data?.trend.map((point) => ({ label: point.label, value: point.value })) ?? [],
    [stockSummary.data],
  );
  const trendAxis = useMemo(() => signedAxisFor(trendData.map((point) => point.value)), [trendData]);
  const adjustmentCount = stockSummary.data?.byType.find((row) => row.type === "ADJUSTMENT")?.movements ?? 0;
  const pendingFulfillments = fulfillment.data?.byStatus.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <div className="space-y-6">
        {/* --- Stock summary --------------------------------------------------- */}
        <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-ink">{t("stock.reports.summaryTitle")}</h2>
          <p className="text-sm text-muted">{t("stock.reports.summarySub")}</p>

          {stockSummary.error ? (
            <ApiErrorState message={stockSummary.error} onRetry={stockSummary.reload} className="mt-6" />
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={ArrowDownToLine}
                  label={t("stock.reports.totalInbound")}
                  value={
                    stockSummary.loading ? (
                      <Skeleton className="mt-3 h-8 w-24" />
                    ) : (
                      `+${(stockSummary.data?.totalInbound ?? 0).toLocaleString()} sqm`
                    )
                  }
                  valueTone="text-[#556500]"
                />
                <StatCard
                  icon={ArrowUpFromLine}
                  label={t("stock.reports.totalOutbound")}
                  value={
                    stockSummary.loading ? (
                      <Skeleton className="mt-3 h-8 w-24" />
                    ) : (
                      `−${Math.abs(stockSummary.data?.totalOutbound ?? 0).toLocaleString()} sqm`
                    )
                  }
                />
                <StatCard
                  icon={PencilLine}
                  label={t("stock.reports.adjustments")}
                  value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-16" /> : adjustmentCount.toString()}
                />
                <StatCard
                  icon={Scale}
                  label={t("stock.reports.netChange")}
                  value={
                    stockSummary.loading ? (
                      <Skeleton className="mt-3 h-8 w-24" />
                    ) : (
                      formatSignedSqm(stockSummary.data?.netChange ?? 0)
                    )
                  }
                  valueTone={(stockSummary.data?.netChange ?? 0) >= 0 ? "text-[#556500]" : "text-red-600"}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={WalletCards}
                  label={t("stock.overview.totalInventoryValue")}
                  value={
                    stockSummary.loading ? (
                      <Skeleton className="mt-3 h-8 w-24" />
                    ) : (
                      formatCompactCurrency(stockSummary.data?.totalInventoryValue ?? 0)
                    )
                  }
                />
                <StatCard
                  icon={ShelvingUnit}
                  label={t("stock.overview.activeProducts")}
                  value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-16" /> : (stockSummary.data?.activeProducts ?? 0).toLocaleString()}
                />
                <StatCard
                  icon={AlertTriangle}
                  label={t("stock.overview.lowStockItems")}
                  value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-16" /> : (stockSummary.data?.lowStockItems ?? 0).toLocaleString()}
                  valueTone="text-[#b86a00]"
                />
                <StatCard
                  icon={PackageX}
                  label={t("stock.reports.outOfStockItems")}
                  value={stockSummary.loading ? <Skeleton className="mt-3 h-8 w-16" /> : (stockSummary.data?.outOfStockItems ?? 0).toLocaleString()}
                  valueTone="text-red-600"
                />
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-ink">{t("stock.reports.trendTitle")}</h3>
                <p className="text-xs text-muted">{t("stock.reports.trendSub")}</p>
                <div className="mt-4 h-65 w-full font-data sm:h-72">
                  {stockSummary.loading ? (
                    <ChartSkeleton />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 8, right: 4, left: 0, bottom: 24 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="label"
                          interval="preserveStartEnd"
                          angle={-40}
                          textAnchor="end"
                          tick={ChartAxisTick}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          width={56}
                          ticks={trendAxis.yTicks}
                          domain={trendAxis.yDomain}
                          tick={ChartAxisTick}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip cursor={{ fill: "transparent" }} content={<TrendTooltip />} />
                        <Bar dataKey="value" radius={[2, 2, 2, 2]} animationDuration={700}>
                          {trendData.map((point, index) => (
                            <Cell key={index} fill={point.value >= 0 ? "var(--chart-blue)" : "#dc2626"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* --- Stock movements --------------------------------------------------- */}
        <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">{t("stock.reports.stockMovements")}</h2>
              <p className="text-sm text-muted">{t("stock.reports.stockMovementsSub")}</p>
            </div>
            <div className="flex h-9 items-center gap-1 rounded-lg border border-[#edf0eb] bg-white p-1 shadow-sm">
              {movementFilters.map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant="ghost"
                  onClick={() => changeMovementFilter(filter)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[11px] font-bold tracking-wide",
                    movementFilter === filter
                      ? "bg-ink text-primary hover:bg-ink/80 hover:text-primary/80"
                      : "text-[#514c4d] hover:bg-[#f5f5f5]",
                  )}
                >
                  {t(MOVEMENT_FILTER_KEYS[filter])}
                </Button>
              ))}
            </div>
          </div>

          {movements.loading ? (
            <TableRowsSkeleton />
          ) : movements.error ? (
            <ApiErrorState message={movements.error} onRetry={movements.reload} className="mt-6" />
          ) : (movements.data?.items.length ?? 0) === 0 ? (
            <ApiEmptyState message={t("stock.reports.noMovements")} className="mt-6" />
          ) : (
            <>
              <div className="mt-6 hidden overflow-x-auto md:block">
                <Table className="min-w-160">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("stock.reports.colItem")}</TableHead>
                      <TableHead>{t("stock.reports.colType")}</TableHead>
                      <TableHead>{t("stock.reports.colQty")}</TableHead>
                      <TableHead>{t("stock.reports.colBy")}</TableHead>
                      <TableHead>{t("stock.reports.colTime")}</TableHead>
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
                              {t(`staff.movementType.${movement.type}`)}
                            </span>
                          </TableCell>
                          <TableCell className={cn("font-data", movement.changeAreaSqm < 0 ? "text-red-600" : "text-ink")}>
                            {formatSignedSqm(movement.changeAreaSqm)}
                          </TableCell>
                          <TableCell className="text-xs text-[#71809a]">{movement.adjustedBy?.fullName ?? "—"}</TableCell>
                          <TableCell className="text-xs text-[#71809a]">{formatRelativeTime(movement.createdAt, t)}</TableCell>
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
                          {movement.reference ?? movement.product.sku} • {movement.adjustedBy?.fullName ?? "—"} •{" "}
                          {formatRelativeTime(movement.createdAt, t)}
                        </p>
                        <span
                          className={cn(
                            "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                            movementTone[movement.type],
                          )}
                        >
                          <Icon className="size-3.5" />
                          {t(`staff.movementType.${movement.type}`)}
                        </span>
                      </div>
                      <span className={cn("font-data text-sm font-semibold", movement.changeAreaSqm < 0 ? "text-red-600" : "text-ink")}>
                        {formatSignedSqm(movement.changeAreaSqm)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <ListPagination
                page={movementsPage}
                totalPages={movements.data!.meta.totalPages}
                totalItems={movements.data!.meta.total}
                pageSize={MOVEMENTS_PAGE_SIZE}
                onPageChange={setMovementsPage}
                className="mt-6"
              />
            </>
          )}
        </section>

        {/* --- Low stock + fulfilment queue --------------------------------------- */}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-[14px] bg-white shadow-sm">
            <div className="border-b border-[#edf0eb] px-5 py-5 sm:px-6">
              <h2 className="text-xl font-bold text-ink">{t("stock.reports.lowStockReportTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted">{t("stock.reports.lowStockReportSub")}</p>
            </div>
            <div className="p-5 sm:p-6">
              {lowStock.loading ? (
                <TableRowsSkeleton />
              ) : lowStock.error ? (
                <ApiErrorState message={lowStock.error} onRetry={lowStock.reload} />
              ) : (lowStock.data?.length ?? 0) === 0 ? (
                <ApiEmptyState message={t("stock.overview.noLowStock")} />
              ) : (
                <ul className="space-y-3">
                  {lowStock.data!.map((row) => (
                    <li
                      key={row.productId}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e5] p-3"
                    >
                      <div
                        className="size-12 shrink-0 rounded-md border border-[#e4e5e3] bg-cover bg-center"
                        style={{ backgroundImage: `url(${row.image})` }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{t("stock.overview.sku", { sku: row.sku })}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2.5 py-1 text-xs font-bold",
                            row.stockStatus === "out_of_stock" ? "text-red-600 bg-red-50" : "text-amber-700 bg-amber-50",
                          )}
                        >
                          {t(STOCK_STATUS_KEYS[row.stockStatus])} · {row.quantityOnHandSqm.toLocaleString()} sqm
                        </span>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("stock.reports.colThreshold")}: {row.lowStockThreshold.toLocaleString()} sqm
                        </p>
                      </div>
                      {canAdjust && (
                        <AdjustStockDialog
                          productId={row.productId}
                          productName={row.name}
                          currentStockSqm={row.quantityOnHandSqm}
                          onAdjusted={() => {
                            void lowStock.reload();
                            void stockSummary.reload();
                            void movements.reload();
                          }}
                          renderTrigger={
                            <button
                              type="button"
                              className="ml-auto shrink-0 rounded-md bg-primary px-3 py-2 text-[11px] font-bold tracking-wide text-primary-foreground uppercase hover:brightness-95"
                            />
                          }
                          triggerContent={t("stock.overview.adjustStock")}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[14px] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0eb] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-xl font-bold text-ink">{t("stock.overview.fulfillmentQueue")}</h2>
                <p className="mt-0.5 text-xs text-muted">{t("stock.overview.fulfillmentQueueSub")}</p>
              </div>
              {!fulfillment.loading && !fulfillment.error && (
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-ink">
                  {pendingFulfillments.toLocaleString()}
                </span>
              )}
            </div>
            <div className="p-5 sm:p-6">
              {fulfillment.loading ? (
                <TableRowsSkeleton />
              ) : fulfillment.error ? (
                <ApiErrorState message={fulfillment.error} onRetry={fulfillment.reload} />
              ) : (fulfillment.data?.orders.length ?? 0) === 0 ? (
                <ApiEmptyState message={t("stock.overview.nothingAwaiting")} />
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {fulfillment.data!.byStatus.map((row) => (
                      <span
                        key={row.status}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f3f2] px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {t(`staff.orderStatus.${row.status}`)}
                        <span className="font-data">{row.count}</span>
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-4">
                    {fulfillment.data!.orders.map((order, index) => (
                      <li key={order.id} className="rounded-xl border border-[#e5e7eb] p-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full",
                              index === 0 ? "bg-[#eff9b6] text-[#587000]" : "bg-[#f1f3f2] text-[#758080]",
                            )}
                          >
                            <Boxes className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-ink">{order.orderNumber}</p>
                            <p className="mt-0.5 truncate text-xs text-[#71809a]">
                              {t("stock.overview.itemCount", { count: order.items?.length ?? 0 })}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                              index === 0 ? "bg-primary text-primary-foreground" : "text-ink",
                            )}
                          >
                            {t(`staff.orderStatus.${order.status}`)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-[#e5e7eb] pt-3 text-xs">
                          <span className="flex items-center gap-1.5 text-[#60718b]">
                            <Clock3 className="size-3.5" />
                            {formatRelativeTime(order.createdAt, t)}
                          </span>
                          <Link href={orderHref(order.id)} className="font-bold text-ink hover:underline">
                            {t("stock.overview.process")} <ChevronRight className="inline size-3.5" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </div>
    </div>
  );
};

/** Admin's and the data analyst's own "Stock Reports" page: header + period switcher + `StockReportView`. */
export const StockReportPage = ({ area }: { area: Exclude<StockReportArea, "stock"> }) => {
  const { t } = useTranslation();
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);

  return (
    <div className="mx-auto w-full max-w-[1070px]">
      <DashboardPageHeader title={t(`${area}.stockReport.title`)} subtitle={t(`${area}.stockReport.subtitle`)}>
        <AnalyticsPeriodSwitcher period={periodDays} onChange={setPeriodDays} />
      </DashboardPageHeader>
      <div className="mt-6">
        <StockReportView area={area} period={periodToRange[periodDays]} />
      </div>
    </div>
  );
};
