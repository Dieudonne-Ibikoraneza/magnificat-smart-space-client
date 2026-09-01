"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { ArrowRight, ListFilter, Repeat2, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBarChart, type CategoryDatum } from "@/components/category-bar-chart";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { ConversionFunnel, type ConversionFunnelStage } from "@/components/conversion-funnel";
import { KpiCards, type KpiCardData } from "@/components/kpi-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi, usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { hearAboutUsLabels, roomTypeLabels } from "@/lib/api/mappers";
import type { UserStatus } from "@/lib/api/types";
import { formatCompactCurrency, getInitials } from "@/lib/utils";

const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** A tidy 5-tick 0..max axis scaled to whatever the real data actually is, instead of a fixed scale sized for mock numbers in the thousands. */
const axisFor = (values: number[]) => {
  const max = Math.max(1, ...values);
  const step = Math.max(1, Math.ceil(max / 4));
  const domainMax = step * 4;
  return { yTicks: [0, step, step * 2, step * 3, domainMax], yDomainMax: domainMax };
};

const KpiSkeleton = () => (
  <article className="rounded-2xl bg-card p-5 sm:p-6">
    <Skeleton className="size-5" />
    <Skeleton className="mt-6 h-3 w-24" />
    <Skeleton className="mt-2 h-8 w-16" />
  </article>
);

type CustomerTrendPoint = { day: string; newCustomers: number; repeatCustomers: number };

const CustomerTrendTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <div className="mt-1 space-y-0.5 font-data text-sm text-ink">
        {payload.map((entry) => (
          <p key={entry.name}>
            {entry.name === "newCustomers" ? "New Customers" : "Repeat Customers"}: {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
};

const trendSubtitle: Record<AnalyticsPeriodDays, string> = {
  7: "7-day comparison",
  30: "30-day comparison",
  12: "12-month comparison",
};

/** Orders per bucket, split by first-time vs. repeat customer — `CustomerAnalytics.trend.ordersByCustomerType`. */
const CustomerTrendChart = ({ period, data }: { period: AnalyticsPeriodDays; data: CustomerTrendPoint[] }) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">New vs. Repeat Customer Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">{trendSubtitle[period]}</p>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink/60" /> New Customers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Repeat Customers
        </span>
      </div>
    </div>
    <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={ChartAxisTick} />
          <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tick={ChartAxisTick} />
          <Tooltip cursor={{ stroke: "var(--border)" }} content={<CustomerTrendTooltip />} />
          <Line type="monotone" dataKey="newCustomers" name="newCustomers" stroke="#d1d5db" strokeWidth={2} dot={false} animationDuration={700} />
          <Line type="monotone" dataKey="repeatCustomers" name="repeatCustomers" stroke="var(--primary)" strokeWidth={2.5} dot={false} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
);

const AnalyticsCustomersPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(7);
  const range = periodToRange[period];

  const { data: customerAnalytics, loading: analyticsLoading, error: analyticsError, reload: reloadAnalytics } = useApi(
    () => analyticsApi.customers(range),
    [range],
  );
  const { data: journey, loading: journeyLoading } = useApi(() => analyticsApi.journey(range), [range]);
  const { data: customersData, loading: customersLoading, error: customersError, reload: reloadCustomers } = useApi(
    () => usersApi.listCustomers({ limit: 100 }),
  );

  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [sort, setSort] = useState<"spend" | "name">("spend");
  const [query, setQuery] = useState("");

  const directoryResults = useMemo(() => {
    const customers = customersData?.items ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        (status === "all" || customer.status === status) &&
        (normalizedQuery === "" ||
          customer.fullName.toLowerCase().includes(normalizedQuery) ||
          (customer.email ?? "").toLowerCase().includes(normalizedQuery)),
    );
    return sort === "name"
      ? [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName))
      : [...filtered].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
  }, [customersData, query, sort, status]);

  const kpis: KpiCardData[] = customerAnalytics
    ? [
        { label: "Total Customers", value: customerAnalytics.totalCustomers.toLocaleString(), icon: UsersRound },
        { label: "New Customers", value: customerAnalytics.newCustomers.toLocaleString(), icon: UserRoundPlus },
        { label: "Repeat Customers", value: customerAnalytics.repeatCustomerCount.toLocaleString(), icon: Repeat2 },
        { label: "Repeat Purchase Rate", value: `${customerAnalytics.repeatPurchaseRate.toFixed(1)}%`, icon: Repeat2 },
      ]
    : [];

  // Room types with zero real customers are dropped rather than plotted as
  // empty bars — the enum has 8 values, but a young dataset rarely touches
  // all of them, and an axis full of empty bars just reads as noise.
  const projectTypes: CategoryDatum[] = useMemo(
    () =>
      (customerAnalytics?.projectTypes ?? [])
        .filter((row) => row.customers > 0)
        .map((row) => ({ category: roomTypeLabels[row.roomType], value: row.customers })),
    [customerAnalytics],
  );
  const projectTypesAxis = axisFor(projectTypes.map((row) => row.value));

  const acquisitionChannels: CategoryDatum[] = useMemo(
    () =>
      (customerAnalytics?.byHeardAboutUs ?? []).map((row) => ({
        category: row.source ? hearAboutUsLabels[row.source] : "Not specified",
        value: row.count,
      })),
    [customerAnalytics],
  );
  const acquisitionAxis = axisFor(acquisitionChannels.map((row) => row.value));

  const customerTrendData: CustomerTrendPoint[] = useMemo(() => {
    if (!customerAnalytics) return [];
    const { new: newOrders, repeat: repeatOrders } = customerAnalytics.trend.ordersByCustomerType;
    return newOrders.map((point, index) => ({
      day: point.label,
      newCustomers: point.value,
      repeatCustomers: repeatOrders[index]?.value ?? 0,
    }));
  }, [customerAnalytics]);

  const funnelStages: ConversionFunnelStage[] = useMemo(
    () =>
      (journey?.stages ?? []).map((row, index) => ({
        stage: row.stage,
        customers: row.customers,
        conversionFromPrevious: index === 0 ? undefined : row.conversionFromPrevious,
      })),
    [journey],
  );

  return (
    <>
      <AnalyticsPageHeader title="Customer Analytics" subtitle="Customer insights and engagement trends.">
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AnalyticsPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {analyticsError ? (
          <ApiErrorState message={analyticsError} onRetry={reloadAnalytics} className="my-8" />
        ) : analyticsLoading || !customerAnalytics ? (
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
          {analyticsLoading || !customerAnalytics ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : projectTypes.length === 0 ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Project Types Distribution</h2>
              <p className="mt-1 text-sm text-muted-foreground">Number of customers vs. project type</p>
              <ApiEmptyState message="No customer projects yet." className="py-16" />
            </section>
          ) : (
            <CategoryBarChart
              title="Project Types Distribution"
              subtitle="Distribution of customer projects by category, Number of customers vs. Project Type"
              data={projectTypes}
              tooltipLabel="Customers"
              tooltipValueFormatter={(value) => value.toLocaleString()}
              yTicks={projectTypesAxis.yTicks}
              yDomainMax={projectTypesAxis.yDomainMax}
              yTickFormatter={(value) => value.toLocaleString()}
            />
          )}

          {analyticsLoading || !customerAnalytics ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : (
            <CustomerTrendChart period={period} data={customerTrendData} />
          )}
        </div>

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          {journeyLoading || !journey ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-80 w-full" />
            </section>
          ) : (
            <ConversionFunnel stages={funnelStages} />
          )}

          {analyticsLoading || !customerAnalytics ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : acquisitionChannels.length === 0 ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Acquisition Channel</h2>
              <p className="mt-1 text-sm text-muted-foreground">Customers by Source of Discovery</p>
              <ApiEmptyState message="No customers yet." className="py-16" />
            </section>
          ) : (
            <CategoryBarChart
              title="Acquisition Channel"
              subtitle="Customers by Source of Discovery"
              data={acquisitionChannels}
              tooltipLabel="Customers"
              tooltipValueFormatter={(value) => value.toLocaleString()}
              yTicks={acquisitionAxis.yTicks}
              yDomainMax={acquisitionAxis.yDomainMax}
              yTickFormatter={(value) => value.toLocaleString()}
              uppercaseTooltipLabel
            />
          )}
        </div>

        <section>
          <h2 className="text-lg font-bold text-ink">Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">View and filter system registered customers</p>

          <div className="mt-5 rounded-2xl bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
                <ListFilter className="size-5 shrink-0" strokeWidth={1.8} />
                <span>Filter by:</span>
              </div>
              <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
                <div className="min-w-0">
                  <span className="sr-only">Status</span>
                  <Select value={status} onValueChange={(value) => setStatus((value ?? "all") as "all" | UserStatus)}>
                    <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                      <SelectValue className="min-w-0 truncate">
                        {(value) =>
                          value === "all" ? "Status: All" : `Status: ${value === "ACTIVE" ? "Active" : value === "INACTIVE" ? "Inactive" : "Suspended"}`
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Status: All</SelectItem>
                      <SelectItem value="ACTIVE">Status: Active</SelectItem>
                      <SelectItem value="INACTIVE">Status: Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Status: Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <span className="sr-only">Total spend</span>
                  <Select value={sort} onValueChange={(value) => setSort((value ?? "spend") as "spend" | "name")}>
                    <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                      <SelectValue className="min-w-0 truncate">{(value) => (value === "name" ? "Name: A - Z" : "Total Spend: Highest")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spend">Total Spend: Highest</SelectItem>
                      <SelectItem value="name">Name: A - Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative flex-1 lg:mx-2">
                <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by customer name, email..."
                  aria-label="Search customers"
                  className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <p className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:hidden xl:inline">
                Showing {directoryResults.length} result{directoryResults.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {customersLoading ? (
            <div className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-2xl bg-card p-5 sm:p-6">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-4 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : customersError ? (
            <ApiErrorState message={customersError} onRetry={reloadCustomers} className="mt-5" />
          ) : directoryResults.length === 0 ? (
            <ApiEmptyState message="No customers match your filters." className="mt-5 py-16" />
          ) : (
            <ul className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {directoryResults.map((customer) => (
                <li key={customer.id} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {getInitials(customer.fullName)}
                      </span>
                      <h3 className="min-w-0 truncate text-lg font-bold text-ink">{customer.fullName}</h3>
                    </div>
                    <Badge variant={customer.status === "ACTIVE" ? "primary" : customer.status === "SUSPENDED" ? "destructive" : "muted"}>
                      {customer.status}
                    </Badge>
                  </div>
                  <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">Contact</dt>
                      <dd className="min-w-0 text-right font-data text-ink">
                        <span className="block truncate">{customer.email ?? "—"}</span>
                        <span className="block whitespace-nowrap">{customer.phone ?? "—"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Last Order</dt>
                      <dd className="whitespace-nowrap font-data text-ink">
                        {customer.lastOrderAt ? formatShortDate(customer.lastOrderAt) : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Total Orders</dt>
                      <dd className="whitespace-nowrap font-data text-ink">{customer.orderCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                      <dt className="text-muted-foreground">Total Spend</dt>
                      <dd className="font-data text-xl font-semibold whitespace-nowrap text-ink">
                        {formatCompactCurrency(customer.lifetimeSpend)}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/analytics/customers/${customer.id}`}
                    className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                  >
                    View Details
                    <ArrowRight className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

export default AnalyticsCustomersPage;
