"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  Calendar,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  MousePointerClick,
  MousePointerSquareDashed,
  ShoppingBag,
  PackageCheck,
  Pencil,
  Repeat,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  ThumbsDown,
  Truck,
  XCircle,
  Minus,
  Smile,
  Trash2,
  TrendingUp,
  Wallet,
  UsersRound,
  Coins,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { OrderStatusBadge } from "@/components/order-status-control";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { Skeleton } from "@/components/ui/skeleton";
import { JOURNEY_STAGE_META } from "@/components/conversion-funnel";
import { cn, formatCompactCurrency, formatCompactNumber } from "@/lib/utils";
import { analyticsApi, ordersApi, productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { AnalyticsPeriod, ApiProduct, OrderStatus, TilePerformanceRow } from "@/lib/api/types";

const pct = (numerator: number, denominator: number) =>
  denominator > 0 ? (numerator / denominator) * 100 : 0;

/** The chart's own 7D/30D/3M/12M granularity mapped onto the backend's three real period buckets — "3M" has no distinct bucket of its own, so it shows the same 30-day figures as "30D" rather than inventing a fourth series. */
const rangeToPeriod: Record<"7D" | "30D" | "3M" | "12M", AnalyticsPeriod> = {
  "7D": "WEEKLY",
  "30D": "MONTHLY",
  "3M": "MONTHLY",
  "12M": "YEARLY",
};

const orderStatusMeta: Record<OrderStatus, { icon: typeof Clock3; tone: string }> = {
  PENDING: { icon: Clock3, tone: "bg-slate-100 text-ink" },
  PROCESSING: { icon: Clock3, tone: "bg-amber-50 text-amber-600" },
  READY_FOR_DISPATCH: { icon: PackageCheck, tone: "bg-blue-50 text-blue-600" },
  SHIPPED: { icon: Truck, tone: "bg-blue-50 text-blue-600" },
  DELIVERED: { icon: PackageCheck, tone: "bg-green-50 text-green-600" },
  CANCELLED: { icon: XCircle, tone: "bg-red-50 text-red-600" },
};

const stockDot = { low_stock: "bg-amber-500", out_of_stock: "bg-red-500" } as const;
const stockText = { low_stock: "text-amber-600", out_of_stock: "text-red-600" } as const;

const HeaderActions = () => (
  <div className="flex shrink-0 items-center gap-2">
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-ink hover:bg-secondary"
    >
      <Calendar className="size-4" /> Last 30 Days
    </button>
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <Download className="size-4" /> Export Data
    </button>
  </div>
);

const KpiSkeleton = () => (
  <article className="flex h-full flex-col rounded-2xl bg-card p-4 sm:p-5">
    <Skeleton className="size-5" />
    <div className="mt-3 flex flex-1 flex-col justify-end gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
  </article>
);

const KpiCards = ({ overview, loading }: { overview: AnalyticsOverviewLike | undefined; loading: boolean }) => {
  if (loading && !overview) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!overview) return null;

  const opened = overview.funnel.find((row) => row.stage === "OPENED_SYSTEM")?.customers ?? 0;
  const purchased = overview.funnel.find((row) => row.stage === "PURCHASED")?.customers ?? 0;
  const avgConversion = pct(purchased, opened);

  const kpis = [
    { label: "Total Sales (RWF)", value: formatCompactNumber(overview.totalSales), icon: Wallet },
    { label: "Total Orders", value: overview.totalOrders.toLocaleString(), icon: ShoppingBasket },
    { label: "Total Customers", value: overview.totalCustomers.toLocaleString(), icon: UsersRound },
    { label: "Repeat Customers", value: overview.repeatCustomers.toLocaleString(), icon: Repeat },
    {
      label: "Inventory",
      value: `${overview.activeProducts.toLocaleString()} Products`,
      warning: overview.lowStockItems > 0 ? `${overview.lowStockItems} Low Stock` : undefined,
      icon: ShoppingBag,
    },
    { label: "Avg. Conversion", value: `${avgConversion.toFixed(1)}%`, icon: Coins },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;

        return (
          <article key={kpi.label} className="flex h-full flex-col rounded-2xl bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <Icon className="size-5 stroke-2 text-ink" />
              {kpi.warning ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-amber-600">
                  <AlertTriangle className="size-3" />
                  {kpi.warning}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-1 flex-col justify-end">
              <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {kpi.label}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-2xl font-black text-ink">{kpi.value}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const SalesOverviewTooltip = ({
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
      <p className="mt-1 font-data text-sm text-ink">RWF {payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const SalesOverview = () => {
  const [range, setRange] = useState<"7D" | "30D" | "3M" | "12M">("30D");
  const { data: overview, loading } = useApi(
    () => analyticsApi.overview(rangeToPeriod[range]),
    [range],
  );

  const data = (overview?.revenueTrend ?? []).map((point) => ({ day: point.label, value: point.value }));

  return (
    <section className="grid gap-5 rounded-2xl bg-card p-5 sm:gap-6 sm:p-6 xl:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Sales Overview</h2>
          <div className="flex h-9 items-center rounded-lg border border-border bg-background p-1">
            {(["7D", "30D", "3M", "12M"] as const).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setRange(item)}
                aria-pressed={range === item}
                className={cn(
                  "h-7 rounded-md px-3 text-[10px] font-bold tracking-wide transition-colors",
                  range === item ? "bg-ink text-primary" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-72">
          {loading && !overview ? (
            <Skeleton className="size-full" />
          ) : data.length === 0 ? (
            <ApiEmptyState message="No revenue recorded yet for this range." className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="admin-sales-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={ChartAxisTick} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 1_000_000}M`)}
                  tick={ChartAxisTick}
                />
                <Tooltip content={<SalesOverviewTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--ink)"
                  strokeWidth={2.5}
                  fill="url(#admin-sales-gradient)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Total Sales</p>
          <p className="mt-1 text-xl font-black text-ink">
            {overview ? formatCompactCurrency(overview.totalSales) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Average Order</p>
          <p className="mt-1 text-xl font-black text-ink">
            {overview ? formatCompactCurrency(overview.averageOrderValue) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Total Orders</p>
          <p className="mt-1 text-xl font-black text-ink">{overview ? overview.totalOrders.toLocaleString() : "—"}</p>
        </div>
      </div>
    </section>
  );
};

const NeedsAttention = ({ overview, loading }: { overview: AnalyticsOverviewLike | undefined; loading: boolean }) => {
  const items = overview
    ? [
        { label: "Out of Stock", count: overview.outOfStockItems, icon: Box, tone: "bg-red-50 text-red-600" },
        { label: "Low Stock", count: overview.lowStockItems, icon: AlertTriangle, tone: "bg-amber-50 text-amber-600" },
        { label: "Pending Orders", count: overview.pendingOrders, icon: Clock3, tone: "bg-slate-100 text-ink" },
      ]
    : [];

  return (
    <section className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h2 className="text-base font-bold text-ink">Needs Attention</h2>
      </div>
      <ul className="mt-4 flex-1 space-y-2">
        {loading && !overview
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </li>
            ))
          : items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", item.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.label}</p>
                  <span className="shrink-0 rounded-md bg-background px-2 py-1 text-sm font-bold text-ink">
                    {item.count}
                  </span>
                </li>
              );
            })}
      </ul>
    </section>
  );
};

const FunnelCardSkeleton = () => (
  <div className="h-40 w-[168px] shrink-0 rounded-2xl border border-border bg-card p-5">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="mt-16 h-8 w-16" />
    <Skeleton className="mt-1 h-3 w-14" />
  </div>
);

const CustomerJourneyFunnel = ({
  stages,
  loading,
}: {
  stages: { stage: string; customers: number; conversionFromPrevious: number }[];
  loading: boolean;
}) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <h2 className="text-lg font-bold text-ink">Customer Journey Funnel</h2>
    <p className="mt-1 text-sm text-muted-foreground">Conversion rates through the spatial planning flow.</p>
    <div className="scrollbar-hide mt-6 flex gap-6 overflow-x-auto px-2 pb-2">
      {loading && stages.length === 0
        ? Array.from({ length: 6 }).map((_, index) => <FunnelCardSkeleton key={index} />)
        : stages.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const meta = JOURNEY_STAGE_META[step.stage as keyof typeof JOURNEY_STAGE_META];

            return (
              <div key={step.stage} className="relative flex shrink-0">
                <div
                  className={cn(
                    "flex h-40 w-[168px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-5 text-left transition-all duration-200",
                    isLast ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {meta.title}
                  </p>
                  <div>
                    <p className="text-3xl font-black text-ink">{formatCompactNumber(step.customers)}</p>
                    {isFirst ? (
                      <p className="mt-1 text-xs font-medium text-ink/60">100% Volume</p>
                    ) : (
                      <p className="mt-1 text-xs font-medium text-ink/60">
                        {step.conversionFromPrevious.toFixed(0)}% conversion
                      </p>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <span
                    className={cn(
                      "absolute top-1/2 right-0 z-10 inline-flex size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm",
                      isLast ? "border-primary" : "border-border",
                    )}
                  >
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </div>
            );
          })}
    </div>
  </section>
);

const TilePerformance = ({
  leaderboards,
  summary,
  loading,
}: {
  leaderboards: TileLeaderboardsLike | undefined;
  summary: { averageSelectionRate: number; averagePurchaseConversion: number } | undefined;
  loading: boolean;
}) => {
  if (loading && !leaderboards) {
    return (
      <section>
        <h2 className="text-lg font-bold text-ink">Tile Performance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  const topViewed = leaderboards?.mostViewed[0];
  const topApplied = leaderboards?.mostApplied[0];
  const topPurchased = leaderboards?.mostPurchased[0];

  const items = [
    { label: "Most Viewed", value: topViewed?.name ?? "No data yet", sub: topViewed ? `${formatCompactNumber(topViewed.count)} views` : "0 views", icon: Eye },
    { label: "Most Applied", value: topApplied?.name ?? "No data yet", sub: topApplied ? `${formatCompactNumber(topApplied.count)} applications` : "0 applications", icon: MousePointerSquareDashed },
    { label: "Most Purchased", value: topPurchased?.name ?? "No data yet", sub: topPurchased ? `${formatCompactNumber(topPurchased.count)} sales` : "0 sales", icon: ShoppingBasket },
    { label: "Avg. Selection Rate", value: `${(summary?.averageSelectionRate ?? 0).toFixed(1)}%`, sub: null, icon: MousePointerClick },
    { label: "Avg. Conversion", value: `${(summary?.averagePurchaseConversion ?? 0).toFixed(1)}%`, sub: null, icon: Wallet },
  ];

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">Tile Performance</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-5 stroke-2 text-ink" />
              </div>
              <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {item.label}
              </p>
              <p className="mt-1 truncate text-xl font-black text-ink">{item.value}</p>
              {item.sub ? <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};

const InventoryOverview = ({
  overview,
  urgentItems,
  viewsByProductId,
  loading,
  error,
  onRetry,
}: {
  overview: AnalyticsOverviewLike | undefined;
  urgentItems: ApiProduct[];
  viewsByProductId: Map<string, TilePerformanceRow>;
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
}) => {
  const inventoryOverview = overview
    ? [
        { label: "Total Inventory Value", value: formatCompactCurrency(overview.totalInventoryValue), icon: Wallet },
        { label: "Active Products", value: overview.activeProducts.toLocaleString(), icon: PackageCheck },
        { label: "Pending Fulfillments", value: overview.pendingOrders.toLocaleString(), icon: Clock3 },
        { label: "Low Stock Items", value: overview.lowStockItems.toLocaleString(), icon: AlertTriangle, warn: true },
      ]
    : [];

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">Inventory Overview</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !overview
          ? Array.from({ length: 4 }).map((_, index) => <KpiSkeleton key={index} />)
          : inventoryOverview.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className={cn("size-5 stroke-2", item.warn ? "text-amber-500" : "text-ink")} />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col justify-end">
                    <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {item.label}
                    </p>
                    <p className={cn("mt-1 text-3xl font-black", item.warn ? "text-amber-600" : "text-ink")}>
                      {item.value}
                    </p>
                  </div>
                </article>
              );
            })}
      </div>

      <div className="mt-5 rounded-2xl bg-card p-5 sm:p-6">
        <h3 className="text-base font-bold text-ink">Urgent Items</h3>
        {error ? (
          <ApiErrorState message={error} onRetry={onRetry} className="mt-4" />
        ) : !loading && urgentItems.length === 0 ? (
          <ApiEmptyState message="No low or out-of-stock products right now." className="mt-4" />
        ) : (
          <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  <th className="pb-3 pr-4 font-bold">Product</th>
                  <th className="pb-3 pr-4 font-bold">SKU / Code</th>
                  <th className="pb-3 pr-4 font-bold">Size / Format</th>
                  <th className="pb-3 pr-4 font-bold">Current Stock</th>
                  <th className="pb-3 pr-4 font-bold">Unit Price (RWF)</th>
                  <th className="pb-3 pr-4 font-bold">Last Updated</th>
                  <th className="pb-3 pr-4 font-bold">Analytics</th>
                  <th className="pb-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && urgentItems.length === 0
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td colSpan={8} className="py-3">
                          <Skeleton className="h-11 w-full" />
                        </td>
                      </tr>
                    ))
                  : urgentItems.map((item) => {
                      const level = item.stockStatus === "out_of_stock" ? "out_of_stock" : "low_stock";
                      const tile = viewsByProductId.get(item.id);
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                                <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" sizes="44px" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{item.size}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-data whitespace-nowrap text-ink">{item.sku}</td>
                          <td className="py-3 pr-4 whitespace-nowrap text-ink">{item.size}</td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className={cn("inline-flex items-center gap-1.5 font-data", stockText[level])}>
                              <span className={cn("size-2 rounded-full", stockDot[level])} />
                              {(item.quantityOnHandSqm ?? 0).toLocaleString()} sqm
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-data whitespace-nowrap text-ink">{Number(item.price).toLocaleString()}</td>
                          <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap text-ink">
                            {formatCompactNumber(tile?.viewed ?? 0)} views
                            <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-green-600">
                              <TrendingUp className="size-3.5 stroke-2" /> {(tile?.selectionRate ?? 0).toFixed(1)}% rate
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Link href={`/admin/inventory/${item.id}`} aria-label={`View ${item.name}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                                <Eye className="size-4" />
                              </Link>
                              <Link href={`/admin/inventory/${item.id}`} aria-label={`Edit ${item.name}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                                <Pencil className="size-4" />
                              </Link>
                              <button type="button" aria-label={`Delete ${item.name}`} className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

const RecentOrders = ({
  orders,
  loading,
  error,
  onRetry,
}: {
  orders: RecentOrderLike[];
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
}) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">Recent Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Orders requiring warehouse processing.</p>
      </div>
      <Link
        href="/admin/orders"
        className="group flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wider text-ink"
      >
        VIEW ALL
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
    {error ? (
      <ApiErrorState message={error} onRetry={onRetry} className="mt-4" />
    ) : !loading && orders.length === 0 ? (
      <ApiEmptyState message="No orders yet." className="mt-4" />
    ) : (
      <ul className="mt-4 divide-y divide-border">
        {loading && orders.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </li>
            ))
          : orders.map((order) => {
              const { icon: StatusIcon, tone } = orderStatusMeta[order.status];
              return (
                <li key={order.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone)}>
                      <StatusIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-ink">{order.orderNumber}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          {order.createdByType === "STAFF" && (
                            <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? ""} />
                          )}
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customer?.fullName ?? "Unknown customer"} • {order.items?.length ?? 0} Items
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-xs font-semibold text-ink hover:underline"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
      </ul>
    )}
  </section>
);

const AiRecommendations = ({ summary, loading }: { summary: AiSummaryLike | undefined; loading: boolean }) => {
  const pending = summary ? Math.max(summary.displayed - summary.accepted - summary.rejected, 0) : 0;
  const sentiments = summary
    ? [
        { label: `${Math.round(pct(summary.accepted, summary.displayed))}%`, value: pct(summary.accepted, summary.displayed), icon: ShieldCheck, bar: "bg-blue-500", chip: "bg-blue-100 text-blue-600" },
        { label: `${Math.round(pct(pending, summary.displayed))}%`, value: pct(pending, summary.displayed), icon: Minus, bar: "bg-muted-foreground/40", chip: "bg-muted-background text-muted-foreground" },
        { label: `${Math.round(pct(summary.rejected, summary.displayed))}%`, value: pct(summary.rejected, summary.displayed), icon: ThumbsDown, bar: "bg-red-500", chip: "bg-red-100 text-red-600" },
      ]
    : [];

  const aiKpis = summary
    ? [
        { label: "Total Recommendations", value: formatCompactNumber(summary.displayed), icon: Sparkles },
        { label: "Acceptance Rate", value: `${summary.acceptanceRate.toFixed(1)}%`, icon: ShieldCheck },
        { label: "Avg. Match Score", value: `${summary.averageMatchScore.toFixed(1)}%`, icon: TrendingUp },
      ]
    : [];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Bot className="size-5 text-ink" />
        <h2 className="text-lg font-bold text-ink">AI Recommendations</h2>
      </div>

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Recommendation Outcomes
          </p>
          <Smile className="size-5 shrink-0 stroke-2 text-ink" />
        </div>
        <div className="mt-4 space-y-2.5">
          {loading && !summary
            ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-6 w-full" />)
            : sentiments.map((sentiment, index) => {
                const Icon = sentiment.icon;
                return (
                  <div key={index} className="flex items-center gap-2.5">
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", sentiment.chip)}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted-background">
                      <div className={cn("h-full rounded-full", sentiment.bar)} style={{ width: `${sentiment.value}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-bold text-ink">{sentiment.label}</span>
                  </div>
                );
              })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading && !summary
          ? Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="flex h-full flex-col rounded-xl border border-border p-4">
                <Skeleton className="size-5" />
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </article>
            ))
          : aiKpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <article key={kpi.label} className="flex h-full flex-col rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="size-5 stroke-2 text-ink" />
                  </div>
                  <div className="mt-3 flex flex-1 flex-col justify-end">
                    <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{kpi.label}</p>
                    <p className="mt-1 text-xl font-black text-ink">{kpi.value}</p>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
};

type AnalyticsOverviewLike = {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  repeatCustomers: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingOrders: number;
  totalInventoryValue: number;
  averageOrderValue: number;
  revenueTrend: { label: string; value: number }[];
  funnel: { stage: string; customers: number }[];
};
type TileLeaderboardsLike = {
  mostViewed: { productId: string; name: string; image: string | null; count: number }[];
  mostApplied: { productId: string; name: string; image: string | null; count: number }[];
  mostPurchased: { productId: string; name: string; image: string | null; count: number }[];
};
type AiSummaryLike = { displayed: number; accepted: number; rejected: number; acceptanceRate: number; averageMatchScore: number };
type RecentOrderLike = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  createdByType: "CUSTOMER" | "STAFF";
  createdBy?: { fullName: string };
  customer?: { fullName: string };
  items?: unknown[];
};

const AdminDashboardPage = () => {
  const { data: overview, loading: overviewLoading, error: overviewError, reload: reloadOverview } = useApi(
    () => analyticsApi.overview("MONTHLY"),
  );
  const { data: journey, loading: journeyLoading } = useApi(() => analyticsApi.journey("MONTHLY"));
  const { data: tiles, loading: tilesLoading } = useApi(() => analyticsApi.tiles({ period: "MONTHLY", limit: 100 }));
  const { data: recommendations, loading: recommendationsLoading } = useApi(
    () => analyticsApi.tileRecommendations({ period: "MONTHLY", limit: 1 }),
  );
  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApi(() => productsApi.list({ limit: 100 }));
  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadOrders,
  } = useApi(() => ordersApi.list({ limit: 3 }));

  const viewsByProductId = useMemo(
    () => new Map((tiles?.table.items ?? []).map((row) => [row.productId, row])),
    [tiles],
  );

  const urgentItems = useMemo(() => {
    const items = (productsData?.items ?? []).filter((product) => product.stockStatus !== "in_stock");
    return [...items]
      .sort((a, b) => {
        if (a.stockStatus !== b.stockStatus) return a.stockStatus === "out_of_stock" ? -1 : 1;
        return (a.quantityOnHandSqm ?? 0) - (b.quantityOnHandSqm ?? 0);
      })
      .slice(0, 5);
  }, [productsData]);

  if (overviewError) {
    return (
      <>
        <AdminPageHeader
          title="System Overview"
          subtitle="Real-time status and operational metrics for Magnificat Smart Space infrastructure"
        >
          <HeaderActions />
        </AdminPageHeader>
        <ApiErrorState message={overviewError} onRetry={reloadOverview} className="mt-8" />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="System Overview"
        subtitle="Real-time status and operational metrics for Magnificat Smart Space infrastructure"
      >
        <HeaderActions />
      </AdminPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <KpiCards overview={overview} loading={overviewLoading} />
        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1fr_320px]">
          <SalesOverview />
          <NeedsAttention overview={overview} loading={overviewLoading} />
        </div>
        <CustomerJourneyFunnel stages={journey?.stages ?? []} loading={journeyLoading} />
        <TilePerformance leaderboards={tiles?.leaderboards} summary={tiles?.summary} loading={tilesLoading} />
        <InventoryOverview
          overview={overview}
          urgentItems={urgentItems}
          viewsByProductId={viewsByProductId}
          loading={overviewLoading || productsLoading}
          error={productsError}
          onRetry={reloadProducts}
        />
        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          <RecentOrders
            orders={ordersData?.items ?? []}
            loading={ordersLoading}
            error={ordersError}
            onRetry={reloadOrders}
          />
          <AiRecommendations summary={recommendations?.summary} loading={recommendationsLoading} />
        </div>
      </div>
    </>
  );
};

export default AdminDashboardPage;
