"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronRight,
  Clock3,
  Coins,
  MoreVertical,
  ShoppingBasket,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { SalesPageHeader } from "@/app/sales/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { OrderStatusBadge } from "@/components/order-status-control";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi, ordersApi, usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { formatCompactCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

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
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <p className="mt-1 font-data text-sm text-ink">Revenue: {formatRWF(payload[0].value)}</p>
    </div>
  );
};

/** Revenue-over-time bars fed by `SalesAnalytics.trend` — the shared `RevenueTrendChart` component uses baked-in sample data, so this stays a small local chart instead. */
const SalesTrendChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="h-65 w-full font-data sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 24 }} onMouseLeave={() => setHovered(null)}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="label" angle={-40} textAnchor="end" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={ChartAxisTick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 1_000_000}M`)}
            tick={ChartAxisTick}
          />
          <Tooltip cursor={{ fill: "transparent" }} content={<RevenueTooltip />} />
          <Bar dataKey="value" barSize="70%" radius={[2, 2, 0, 0]} animationDuration={700} onMouseEnter={(_, index) => setHovered(index)}>
            {data.map((_, index) => (
              <Cell key={index} fill="var(--chart-blue)" fillOpacity={hovered === null || hovered === index ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const KpiSkeleton = () => (
  <article className="rounded-xl bg-white p-5 sm:p-6">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-4 h-8 w-32" />
    <Skeleton className="mt-4 h-3 w-28" />
  </article>
);

const SalesOverviewPage = () => {
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(30);
  const range = periodToRange[period];

  const { data: sales, loading: salesLoading, error: salesError, reload: reloadSales } = useApi(
    () => analyticsApi.sales(range),
    [range],
  );
  const { data: customersData, loading: customersLoading } = useApi(() => usersApi.listCustomers({ limit: 100 }));
  const { data: ordersData, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useApi(
    () => ordersApi.list({ limit: 5 }),
  );

  const topCustomers = useMemo(
    () => [...(customersData?.items ?? [])].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend).slice(0, 5),
    [customersData],
  );
  const recentOrders = ordersData?.items ?? [];

  const byCreator = sales
    ? {
        CUSTOMER: sales.byCreator.find((row) => row.createdByType === "CUSTOMER")?.total ?? 0,
        STAFF: sales.byCreator.find((row) => row.createdByType === "STAFF")?.total ?? 0,
      }
    : null;
  const pendingOrders = sales?.byStatus.find((row) => row.status === "PENDING")?.count ?? 0;

  return (
    <>
      <SalesPageHeader title="Overview" subtitle="Track your sales performance and daily tasks.">
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </SalesPageHeader>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {salesError ? (
          <ApiErrorState message={salesError} onRetry={reloadSales} className="my-8" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {salesLoading || !sales || !byCreator ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              <>
                <article className="rounded-xl bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink uppercase">Total Sales</p>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FAFDE9] text-ink">
                      <Coins className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-ink">{formatCompactCurrency(sales.totalSales)}</p>
                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Customer-created</span>
                      <span className="font-data font-semibold text-ink">{formatCompactCurrency(byCreator.CUSTOMER)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Staff-created</span>
                      <span className="font-data font-semibold text-ink">{formatCompactCurrency(byCreator.STAFF)}</span>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold sm:mt-5",
                      sales.percentChangeVsLastPeriod < 0 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700",
                    )}
                  >
                    {sales.percentChangeVsLastPeriod < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                    {sales.percentChangeVsLastPeriod > 0 ? "+" : ""}
                    {sales.percentChangeVsLastPeriod.toFixed(1)}% vs last period
                  </p>
                </article>

                <article className="rounded-xl bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink uppercase">Total Orders</p>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-ink">
                      <ShoppingBasket className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-ink">{sales.totalOrders.toLocaleString()}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">
                    Avg. {formatRWF(sales.averageOrderValue)} / order
                  </p>
                </article>

                <article className="rounded-xl bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink uppercase">Pending Orders</p>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-ink">
                      <Clock3 className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-ink">{pendingOrders.toLocaleString()}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">Requires attention</p>
                </article>

                <article className="rounded-xl bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink uppercase">Total Customers</p>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-ink">
                      <UsersRound className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-ink">{sales.totalCustomers.toLocaleString()}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">
                    {sales.repeatPurchaseRate.toFixed(0)}% repeat purchase rate
                  </p>
                </article>
              </>
            )}
          </div>
        )}

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Sales Performance</h2>
                <p className="mt-1 text-sm text-muted-foreground">Shipped &amp; delivered revenue (RWF) across the selected period</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-8">
              {salesLoading || !sales ? (
                <Skeleton className="h-65 w-full sm:h-80" />
              ) : sales.trend.length === 0 ? (
                <ApiEmptyState message="No sales in this period yet." className="py-16" />
              ) : (
                <SalesTrendChart data={sales.trend} />
              )}
            </div>
          </section>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Top Customers</h2>
            {customersLoading ? (
              <div className="mt-4 flex-1 space-y-4">
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
              <ApiEmptyState message="No customers yet." className="flex-1 py-10" />
            ) : (
              <ul className="mt-4 flex-1">
                {topCustomers.map((customer) => (
                  <li key={customer.id} className="border-b border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => router.push(`/sales/orders/new?customer=${customer.id}`)}
                      className="group flex w-full min-w-0 items-start gap-3 px-2 py-4 text-left transition-colors hover:bg-secondary/60"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card transition-transform duration-200 group-hover:scale-110">
                        {getInitials(customer.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{customer.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {customer.orderCount} Order{customer.orderCount === 1 ? "" : "s"}
                          {customer.lastOrderAt ? ` • Last ${new Date(customer.lastOrderAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}
                        </p>
                      </div>
                      <span className="max-w-[38%] shrink-0 wrap-break-word text-right font-data text-sm font-semibold text-ink">
                        {formatCompactCurrency(customer.lifetimeSpend)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/sales/customers"
              className="mt-2 block w-full rounded-lg py-3 text-center text-sm font-medium text-ink transition-all duration-200 hover:bg-secondary active:scale-[0.98]"
            >
              View All
            </Link>
          </section>
        </div>

        <section className="rounded-2xl bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Best Selling Tiles</h2>
              <p className="mt-1 text-sm text-muted-foreground">By revenue in the selected period</p>
            </div>
            {sales?.topPerformer && (
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <Target className="size-3.5" /> Top: {sales.topPerformer.name}
              </span>
            )}
          </div>
          {salesLoading || !sales ? (
            <div className="mt-4 space-y-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Skeleton className="size-14 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sales.bestSellingTiles.length === 0 ? (
            <ApiEmptyState message="No tiles sold in this period yet." className="py-10" />
          ) : (
            <ul className="mt-4">
              {sales.bestSellingTiles.slice(0, 5).map((tile, index) => (
                <li key={tile.productId} className={index > 0 ? "border-t border-border" : undefined}>
                  <Link href={`/sales/catalog/${tile.productId}`} className="flex items-center gap-3 py-4 transition-colors hover:bg-secondary/40">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      {tile.image && <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{tile.pieces.toLocaleString()} pieces sold</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-data text-sm font-semibold text-ink">{formatCompactCurrency(tile.revenue)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="animate-fade-in overflow-hidden rounded-2xl bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <h2 className="truncate text-lg font-bold text-ink">Recent Orders</h2>
            <Link href="/sales/orders" className="group flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wider text-ink">
              VIEW ALL
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="space-y-4 px-5 pb-6 sm:px-6">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center justify-between gap-4 border-b border-border pb-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : ordersError ? (
            <ApiErrorState message={ordersError} onRetry={reloadOrders} className="mx-5 mb-6" />
          ) : recentOrders.length === 0 ? (
            <ApiEmptyState message="No orders yet." className="mx-5 mb-6" />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Order ID", "Customer", "Date", "Amount", "Status", "Action"].map((head) => (
                        <TableHead key={head}>{head}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        tabIndex={0}
                        aria-label={`View details for ${order.orderNumber}`}
                        onClick={() => router.push(`/sales/orders/${order.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/sales/orders/${order.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-semibold text-ink">
                          <Link href={`/sales/orders/${order.id}`} className="hover:underline">
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-ink">{order.customer?.fullName ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap text-ink">{formatRWF(Number(order.total))}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? "Staff"} />}
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/sales/orders/${order.id}`} aria-label={`View ${order.orderNumber}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                            <MoreVertical className="size-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex items-start justify-between gap-3 px-5 py-4 font-data">
                    <Link href={`/sales/orders/${order.id}`} className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{order.orderNumber}</p>
                        <p className="truncate text-sm text-ink">{order.customer?.fullName ?? "—"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-sm font-semibold text-ink">{formatRWF(Number(order.total))}</p>
                        <div className="flex items-center gap-2">
                          {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? "Staff"} />}
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
};

export default SalesOverviewPage;
