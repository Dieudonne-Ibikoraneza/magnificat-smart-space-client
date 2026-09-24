"use client";

import { billedAreaOf } from "@/lib/order-area";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ExternalLink,
  ListFilter,
  Search,
  ShoppingBasket,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardPageHeader as AnalyticsPageHeader } from "@/components/dashboard-page-headers";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { OrderStatusBadge } from "@/components/order-status-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBarChart, type CategoryDatum } from "@/components/category-bar-chart";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import { cn, formatCompactCurrency } from "@/lib/utils";
import { analyticsApi, ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { ApiOrder, RoomType } from "@/lib/api/types";

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

type SalesKpi =
  | {
      label: string;
      value: string;
      icon: typeof Wallet;
      trend?: string;
      /** Shown as a separate footnote line, deliberately not folded into `value` — see `AnalyticsService#orderSubtotal`. */
      transportFees?: number;
    }
  | {
      label: string;
      value: string;
      icon: typeof Wallet;
      badge: string;
      subtitle: string;
    };

/** A tidy 5-tick 0..max axis scaled to whatever the real data actually is, instead of a fixed scale sized for mock numbers in the millions. */
const axisFor = (values: number[]) => {
  const max = Math.max(1, ...values);
  const step = Math.max(1, Math.ceil(max / 4));
  const domainMax = step * 4;
  return { yTicks: [0, step, step * 2, step * 3, domainMax], yDomainMax: domainMax };
};

const formatRWF = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const KpiCard = (kpi: SalesKpi) => {
  const { t } = useTranslation();
  const Icon = kpi.icon;

  return (
    <article className="flex flex-col h-full rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <Icon className="size-5 stroke-2 text-ink" />
        {"badge" in kpi ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            {kpi.badge}
          </span>
        ) : (
          kpi.trend && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                kpi.trend.startsWith("-") ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700",
              )}
            >
              {kpi.trend.startsWith("-") ? (
                <TrendingDown className="size-3" />
              ) : (
                <TrendingUp className="size-3" />
              )}
              {kpi.trend}
            </span>
          )
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-end">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          {kpi.label}
        </p>
        <p className="mt-1 truncate text-2xl font-black text-ink">{kpi.value}</p>
        {"subtitle" in kpi && (
          <p className="mt-1 text-xs text-muted-foreground">{kpi.subtitle}</p>
        )}
      </div>
      {"transportFees" in kpi && kpi.transportFees !== undefined && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">{t("analytics.sales.transportFeesNote")}</span>
          <span className="font-data font-semibold text-ink">{formatCompactCurrency(kpi.transportFees)}</span>
        </div>
      )}
    </article>
  );
};

const KpiSkeleton = () => (
  <article className="rounded-2xl bg-card p-5 sm:p-6">
    <Skeleton className="size-5" />
    <Skeleton className="mt-6 h-3 w-24" />
    <Skeleton className="mt-2 h-8 w-16" />
  </article>
);

const TileListSkeleton = () => (
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
);

const RecentOrders = ({ orders, loading, error, onRetry }: { orders: ApiOrder[]; loading: boolean; error?: string; onRetry: () => void }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = orders.filter(
      (order) =>
        (status === "all" || order.status === status) &&
        (normalizedQuery === "" ||
          (order.customer?.fullName ?? "").toLowerCase().includes(normalizedQuery) ||
          order.orderNumber.toLowerCase().includes(normalizedQuery)),
    );

    return sort === "oldest" ? [...filtered].reverse() : filtered;
  }, [orders, query, sort, status]);

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{t("analytics.sales.recentOrders")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("analytics.sales.recentOrdersSub")}</p>

      <div className="mt-5 rounded-2xl bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
            <ListFilter className="size-5 shrink-0" strokeWidth={1.8} />
            <span>{t("analytics.common.filterBy")}</span>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
            <div className="min-w-0">
              <span className="sr-only">{t("analytics.customers.status")}</span>
              <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">
                    {(value) =>
                      value === "all" || !value
                        ? t("analytics.sales.statusAll")
                        : t("analytics.sales.statusValue", { status: t(`staff.orderStatus.${value}`) })
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("analytics.sales.statusAll")}</SelectItem>
                  <SelectItem value="PROCESSING">{t("analytics.sales.statusValue", { status: t("staff.orderStatus.PROCESSING") })}</SelectItem>
                  <SelectItem value="SHIPPED">{t("analytics.sales.statusValue", { status: t("staff.orderStatus.SHIPPED") })}</SelectItem>
                  <SelectItem value="DELIVERED">{t("analytics.sales.statusValue", { status: t("staff.orderStatus.DELIVERED") })}</SelectItem>
                  <SelectItem value="CANCELLED">{t("analytics.sales.statusValue", { status: t("staff.orderStatus.CANCELLED") })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <span className="sr-only">{t("analytics.sales.orderDate")}</span>
              <Select value={sort} onValueChange={(value) => setSort(value ?? "newest")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">{(value) => (value === "oldest" ? t("analytics.sales.orderDateOldest") : t("analytics.sales.orderDateNewest"))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("analytics.sales.orderDateNewest")}</SelectItem>
                  <SelectItem value="oldest">{t("analytics.sales.orderDateOldest")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative flex-1 lg:mx-2">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("analytics.sales.searchPlaceholder")}
              aria-label={t("analytics.sales.searchAria")}
              className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <p className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:hidden xl:inline">
            {t("analytics.common.showingResults", { count: results.length })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ApiErrorState message={error} onRetry={onRetry} className="mt-5" />
      ) : results.length === 0 ? (
        <ApiEmptyState message={t("analytics.sales.noOrders")} className="mt-5 py-16" />
      ) : (
        <ul className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((order) => {
            const items = order.items ?? [];
            const totalVolume = items.reduce((sum, item) => sum + billedAreaOf(item), 0);
            return (
              <li key={order.id} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-data text-xs text-muted-foreground">#{order.orderNumber}</p>
                    <h3 className="mt-0.5 truncate text-xl font-bold text-ink">{order.customer?.fullName ?? t("analytics.common.unknownCustomer")}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {order.createdByType === "STAFF" && (
                      <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? t("analytics.common.staffFallback")} />
                    )}
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{t("analytics.sales.summary")}</dt>
                    <dd className="min-w-0 text-right font-data text-ink">
                      <span className="block">{t("analytics.sales.productTypes", { count: items.length })}</span>
                      <span className="block whitespace-nowrap">{totalVolume.toLocaleString()} sqm</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("analytics.sales.orderDateLabel")}</dt>
                    <dd className="whitespace-nowrap font-data text-ink">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                    <dt className="text-muted-foreground">{t("analytics.sales.totalSpend")}</dt>
                    <dd className="font-data text-xl font-semibold whitespace-nowrap text-ink">{formatRWF(order.total)}</dd>
                  </div>
                </dl>
                <Link
                  href={`/analytics/orders/${order.id}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  {t("analytics.common.viewDetails")}
                  <ArrowRight className="size-4" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const AnalyticsSalesPage = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(7);
  const range = periodToRange[period];

  const { data: sales, loading: salesLoading, error: salesError, reload: reloadSales } = useApi(() => analyticsApi.sales(range), [range]);
  const { data: customerAnalytics, loading: customerAnalyticsLoading } = useApi(() => analyticsApi.customers(range), [range]);
  const { data: tiles, loading: tilesLoading } = useApi(() => analyticsApi.tiles({ period: range }), [range]);
  const { data: ordersData, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useApi(() => ordersApi.listAll());

  const kpis: SalesKpi[] = sales
    ? [
        {
          label: t("analytics.sales.kpiTotalSales"),
          value: formatCompactCurrency(sales.totalSales),
          icon: Wallet,
          trend: `${sales.percentChangeVsLastPeriod > 0 ? "+" : ""}${sales.percentChangeVsLastPeriod.toFixed(1)}%`,
          transportFees: sales.totalTransportFees,
        },
        { label: t("analytics.sales.kpiAvgOrderValue"), value: formatRWF(sales.averageOrderValue), icon: ShoppingBasket },
        { label: t("analytics.sales.kpiTotalOrders"), value: sales.totalOrders.toLocaleString(), icon: ShoppingBasket },
        sales.topPerformer
          ? {
              label: t("analytics.sales.kpiBestSelling"),
              value: sales.topPerformer.name,
              icon: Target,
              badge: t("analytics.sales.topPerformer"),
              subtitle: sales.totalSales > 0 ? t("analytics.sales.ofTotalRevenue", { value: ((sales.topPerformer.revenue / sales.totalSales) * 100).toFixed(0) }) : "",
            }
          : { label: t("analytics.sales.kpiBestSelling"), value: t("analytics.sales.noSalesYet"), icon: Target },
      ]
    : [];

  const projectTypeRevenue: CategoryDatum[] = useMemo(
    () => (customerAnalytics?.projectTypes ?? []).map((row) => ({ category: t(ROOM_TYPE_KEYS[row.roomType]), value: row.revenue })),
    [customerAnalytics, t],
  );
  const projectTypeAxis = axisFor(projectTypeRevenue.map((row) => row.value));

  const topPerformingTiles = sales?.bestSellingTiles.slice(0, 3) ?? [];
  const topAppliedTiles = tiles?.leaderboards.mostApplied.slice(0, 3) ?? [];

  const orders = ordersData?.items.slice(0, 30) ?? [];

  return (
    <>
      <AnalyticsPageHeader
        title={t("analytics.sales.title")}
        subtitle={t("analytics.sales.subtitle")}
      >
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AnalyticsPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {salesError ? (
          <ApiErrorState message={salesError} onRetry={reloadSales} className="my-8" />
        ) : salesLoading || !sales ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        )}

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          {salesLoading || !sales ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : sales.trend.length === 0 ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("analytics.sales.revenueTrends")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("analytics.sales.revenueTrendsSub")}</p>
              <ApiEmptyState message={t("analytics.sales.noSales")} className="py-16" />
            </section>
          ) : (
            <RevenueTrendChart
              title={t("analytics.sales.revenueTrends")}
              subtitle={t("analytics.sales.revenueTrendsSub")}
              range={range}
              data={sales.trend.map((point) => ({ day: point.label, value: point.value }))}
            />
          )}

          {customerAnalyticsLoading || !customerAnalytics ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : projectTypeRevenue.every((row) => row.value === 0) ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("analytics.sales.projectTypes")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("analytics.sales.projectTypesSub")}</p>
              <ApiEmptyState message={t("analytics.sales.noProjectRevenue")} className="py-16" />
            </section>
          ) : (
            <CategoryBarChart
              title={t("analytics.sales.projectTypes")}
              subtitle={t("analytics.sales.projectTypesSub")}
              data={projectTypeRevenue}
              tooltipLabel={t("analytics.sales.tooltipRevenue")}
              tooltipValueFormatter={(value) => formatRWF(value)}
              yTicks={projectTypeAxis.yTicks}
              yDomainMax={projectTypeAxis.yDomainMax}
              yTickFormatter={(value) => (value === 0 ? "0" : formatCompactCurrency(value))}
            />
          )}
        </div>

        <div className="grid gap-5 grid-cols-1 sm:gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink">{t("analytics.sales.topPerformingTiles")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("analytics.sales.byRevenueVolume")}</p>
              </div>
              <Link
                href="/analytics/tiles"
                className="flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-ink hover:underline"
              >
                <ExternalLink className="size-3.5" /> {t("analytics.common.viewAll")}
              </Link>
            </div>
            {salesLoading ? (
              <TileListSkeleton />
            ) : topPerformingTiles.length === 0 ? (
              <ApiEmptyState message={t("analytics.sales.noTileRevenue")} className="py-10" />
            ) : (
              <ul className="mt-4">
                {topPerformingTiles.map((tile, index) => (
                  <li key={tile.productId} className={index > 0 ? "border-t border-border" : undefined}>
                    <div className="flex items-center gap-3 py-4">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        {tile.image && <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{t("analytics.sales.piecesSold", { value: tile.pieces.toLocaleString() })}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-data text-sm font-semibold text-ink">{formatCompactCurrency(tile.revenue)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink">{t("analytics.sales.topAppliedTiles")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("analytics.sales.bySelectionRate")}</p>
              </div>
              <Link
                href="/analytics/tiles"
                className="flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-ink hover:underline"
              >
                <ExternalLink className="size-3.5" /> {t("analytics.common.viewAll")}
              </Link>
            </div>
            {tilesLoading ? (
              <TileListSkeleton />
            ) : topAppliedTiles.length === 0 ? (
              <ApiEmptyState message={t("analytics.sales.noTileApplications")} className="py-10" />
            ) : (
              <ul className="mt-4">
                {topAppliedTiles.map((tile, index) => (
                  <li key={tile.productId} className={index > 0 ? "border-t border-border" : undefined}>
                    <div className="flex items-center gap-3 py-4">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        {tile.image && <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-data text-sm font-semibold text-ink">{t("analytics.sales.applicationsCount", { value: tile.count.toLocaleString() })}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <RecentOrders orders={orders} loading={ordersLoading} error={ordersError} onRetry={reloadOrders} />
      </div>
    </>
  );
};

export default AnalyticsSalesPage;
