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
import { useTranslation } from "react-i18next";
import { ArrowRight, ListFilter, Repeat2, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBarChart, type CategoryDatum } from "@/components/category-bar-chart";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { CustomerConversionFunnel, type ConversionFunnelStage } from "@/components/conversion-funnel";
import { KpiCards, type KpiCardData } from "@/components/kpi-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi, usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { HearAboutUs, RoomType, UserStatus } from "@/lib/api/types";
import { formatCompactCurrency, getInitials } from "@/lib/utils";

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};
const HEAR_ABOUT_KEYS: Record<HearAboutUs, string> = {
  SOCIAL_MEDIA: "auth.discoverySources.SOCIAL_MEDIA",
  REFERRAL: "auth.discoverySources.REFERRAL",
  ADVERTISEMENT: "auth.discoverySources.ADVERTISEMENT",
  SEARCH_ENGINE: "auth.discoverySources.SEARCH_ENGINE",
  OTHER: "auth.discoverySources.OTHER",
};

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
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <div className="mt-1 space-y-0.5 font-data text-sm text-ink">
        {payload.map((entry) => (
          <p key={entry.name}>
            {entry.name === "newCustomers" ? t("analytics.customers.newCustomers") : t("analytics.customers.repeatCustomers")}: {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
};

const TREND_SUBTITLE_KEYS: Record<AnalyticsPeriodDays, string> = {
  7: "analytics.customers.trend7",
  30: "analytics.customers.trend30",
  12: "analytics.customers.trend12",
};

/** Orders per bucket, split by first-time vs. repeat customer — `CustomerAnalytics.trend.ordersByCustomerType`. */
const CustomerTrendChart = ({ period, data }: { period: AnalyticsPeriodDays; data: CustomerTrendPoint[] }) => {
  const { t } = useTranslation();

  return (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">{t("analytics.customers.trendTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(TREND_SUBTITLE_KEYS[period])}</p>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink/60" /> {t("analytics.customers.newCustomers")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> {t("analytics.customers.repeatCustomers")}
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
};

const AdminAnalyticsCustomersPage = () => {
  const { t } = useTranslation();
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
        { label: t("analytics.customers.kpiTotalCustomers"), value: customerAnalytics.totalCustomers.toLocaleString(), icon: UsersRound },
        { label: t("analytics.customers.kpiNewCustomers"), value: customerAnalytics.newCustomers.toLocaleString(), icon: UserRoundPlus },
        { label: t("analytics.customers.kpiRepeatCustomers"), value: customerAnalytics.repeatCustomerCount.toLocaleString(), icon: Repeat2 },
        { label: t("analytics.customers.kpiRepeatRate"), value: `${customerAnalytics.repeatPurchaseRate.toFixed(1)}%`, icon: Repeat2 },
      ]
    : [];

  // Every room type shown, zero-count ones included — a consistent,
  // complete axis rather than only whatever this dataset happens to have.
  const projectTypes: CategoryDatum[] = useMemo(
    () => (customerAnalytics?.projectTypes ?? []).map((row) => ({ category: t(ROOM_TYPE_KEYS[row.roomType]), value: row.customers })),
    [customerAnalytics, t],
  );
  const projectTypesAxis = axisFor(projectTypes.map((row) => row.value));

  const acquisitionChannels: CategoryDatum[] = useMemo(
    () =>
      (customerAnalytics?.byHeardAboutUs ?? []).map((row) => ({
        category: row.source ? t(HEAR_ABOUT_KEYS[row.source]) : t("analytics.common.notSpecified"),
        value: row.count,
      })),
    [customerAnalytics, t],
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
      <AdminPageHeader title={t("analytics.customers.title")} subtitle={t("analytics.customers.subtitle")}>
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AdminPageHeader>
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
          ) : projectTypes.every((row) => row.value === 0) ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("analytics.customers.projectTypesTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("analytics.customers.projectTypesSubShort")}</p>
              <ApiEmptyState message={t("analytics.customers.noProjects")} className="py-16" />
            </section>
          ) : (
            <CategoryBarChart
              title={t("analytics.customers.projectTypesTitle")}
              subtitle={t("analytics.customers.projectTypesSub")}
              data={projectTypes}
              tooltipLabel={t("analytics.customers.tooltipCustomers")}
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
            <CustomerConversionFunnel stages={funnelStages} />
          )}

          {analyticsLoading || !customerAnalytics ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <Skeleton className="h-65 w-full sm:h-80" />
            </section>
          ) : acquisitionChannels.every((row) => row.value === 0) ? (
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("analytics.customers.acquisitionTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("analytics.customers.acquisitionSub")}</p>
              <ApiEmptyState message={t("analytics.customers.noResults")} className="py-16" />
            </section>
          ) : (
            <CategoryBarChart
              title={t("analytics.customers.acquisitionTitle")}
              subtitle={t("analytics.customers.acquisitionSub")}
              data={acquisitionChannels}
              tooltipLabel={t("analytics.customers.tooltipCustomers")}
              tooltipValueFormatter={(value) => value.toLocaleString()}
              yTicks={acquisitionAxis.yTicks}
              yDomainMax={acquisitionAxis.yDomainMax}
              yTickFormatter={(value) => value.toLocaleString()}
              uppercaseTooltipLabel
            />
          )}
        </div>

        <section>
          <h2 className="text-lg font-bold text-ink">{t("analytics.customers.customersHeading")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("analytics.customers.customersSub")}</p>

          <div className="mt-5 rounded-2xl bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
                <ListFilter className="size-5 shrink-0" strokeWidth={1.8} />
                <span>{t("analytics.common.filterBy")}</span>
              </div>
              <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
                <div className="min-w-0">
                  <span className="sr-only">{t("analytics.customers.status")}</span>
                  <Select value={status} onValueChange={(value) => setStatus((value ?? "all") as "all" | UserStatus)}>
                    <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                      <SelectValue className="min-w-0 truncate">
                        {(value) =>
                          value === "all"
                            ? t("analytics.customers.statusAll")
                            : t("analytics.customers.statusValue", { status: t(`staff.userStatus.${value as UserStatus}`) })
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("analytics.customers.statusAll")}</SelectItem>
                      <SelectItem value="ACTIVE">{t("analytics.customers.statusValue", { status: t("staff.userStatus.ACTIVE") })}</SelectItem>
                      <SelectItem value="INACTIVE">{t("analytics.customers.statusValue", { status: t("staff.userStatus.INACTIVE") })}</SelectItem>
                      <SelectItem value="SUSPENDED">{t("analytics.customers.statusValue", { status: t("staff.userStatus.SUSPENDED") })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <span className="sr-only">{t("analytics.customers.totalSpend")}</span>
                  <Select value={sort} onValueChange={(value) => setSort((value ?? "spend") as "spend" | "name")}>
                    <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                      <SelectValue className="min-w-0 truncate">{(value) => (value === "name" ? t("analytics.customers.nameAZ") : t("analytics.customers.spendHighest"))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spend">{t("analytics.customers.spendHighest")}</SelectItem>
                      <SelectItem value="name">{t("analytics.customers.nameAZ")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative flex-1 lg:mx-2">
                <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("analytics.customers.searchPlaceholder")}
                  aria-label={t("analytics.customers.searchAria")}
                  className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <p className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:hidden xl:inline">
                {t("analytics.common.showingResults", { count: directoryResults.length })}
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
            <ApiEmptyState message={t("analytics.customers.noResults")} className="mt-5 py-16" />
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
                      {t(`staff.userStatus.${customer.status}`)}
                    </Badge>
                  </div>
                  <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{t("analytics.customers.contact")}</dt>
                      <dd className="min-w-0 text-right font-data text-ink">
                        <span className="block truncate">{customer.email ?? "—"}</span>
                        <span className="block whitespace-nowrap">{customer.phone ?? "—"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t("analytics.customers.lastOrder")}</dt>
                      <dd className="whitespace-nowrap font-data text-ink">
                        {customer.lastOrderAt ? formatShortDate(customer.lastOrderAt) : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t("analytics.customers.totalOrders")}</dt>
                      <dd className="whitespace-nowrap font-data text-ink">{customer.orderCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                      <dt className="text-muted-foreground">{t("analytics.customers.totalSpendLabel")}</dt>
                      <dd className="font-data text-xl font-semibold whitespace-nowrap text-ink">
                        {formatCompactCurrency(customer.lifetimeSpend)}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                  >
                    {t("analytics.common.viewDetails")}
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

export default AdminAnalyticsCustomersPage;
