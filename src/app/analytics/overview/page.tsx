"use client";

import Image from "next/image";
import Link from "next/link";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Coins, CircleCheckBig, ExternalLink, Repeat2, UsersRound } from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { KpiCards, type KpiCardData } from "@/components/kpi-cards";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { products } from "@/data/catalog";
import { salesCustomers } from "@/data/sales-customers";

const recommendationData = [
  { day: "Mon", matchScore: 18, acceptance: 5 },
  { day: "Tue", matchScore: 32, acceptance: 34 },
  { day: "Wed", matchScore: 45, acceptance: 48 },
  { day: "Thu", matchScore: 50, acceptance: 45 },
  { day: "Fri", matchScore: 42, acceptance: 62 },
  { day: "Sat", matchScore: 56, acceptance: 85 },
  { day: "Sun", matchScore: 46, acceptance: 55 },
];

const kpis: KpiCardData[] = [
  { label: "Total Sales (RWF)", value: "128.5M", icon: Coins, trend: "+12%" },
  { label: "Total Customers", value: "842", icon: UsersRound, trend: "+8.4%" },
  { label: "Repeat Purchase Rate", value: "68%", icon: Repeat2, trend: "+5%" },
  {
    label: "Recommendation Acceptance Rate",
    value: "82%",
    icon: CircleCheckBig,
    badge: { label: "Good", icon: CircleCheckBig },
  },
];

const topTiles = products.slice(0, 3).map((product, index) => ({
  ...product,
  views: "12.4K views",
  selection: [12, 10.1, 9.2][index],
}));

const topCustomers = salesCustomers.slice(0, 4).map((customer) => ({
  slug: customer.slug,
  initials: customer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
  name: customer.name,
  meta: `${customer.orders.length} Orders • Last ${customer.lastOrder}`,
  amount: customer.lifetimeSpend,
}));

const RecommendationTooltip = ({
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
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">
        {label}
      </p>
      <div className="mt-1 space-y-0.5 font-data text-sm text-ink">
        {payload.map((entry) => (
          <p key={entry.name}>
            {entry.name === "acceptance" ? "Acceptance" : "Match Score"}:{" "}
            {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
};

const AiRecommendationChart = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">AI Recommendation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI Recommendations match score vs acceptance rate
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink/60" /> Match Score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Acceptance
        </span>
      </div>
    </div>
    <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={recommendationData}
          margin={{ top: 8, right: 4, left: 0, bottom: 24 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={ChartAxisTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, 100]}
            tick={ChartAxisTick}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={<RecommendationTooltip />}
          />
          <Line
            type="monotone"
            dataKey="matchScore"
            name="matchScore"
            stroke="#d1d5db"
            strokeWidth={2}
            dot={false}
            animationDuration={700}
          />
          <Line
            type="monotone"
            dataKey="acceptance"
            name="acceptance"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
);

const TopPerformingTiles = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">Top Performing Tiles</h2>
      <Link
        href="/analytics/tiles"
        className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
      >
        <ExternalLink className="size-3.5" /> View All
      </Link>
    </div>
    <ul className="mt-4">
      {topTiles.map((tile, index) => (
        <li
          key={tile.id}
          className={index > 0 ? "border-t border-border" : undefined}
        >
          <div className="flex items-center gap-3 py-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
              <Image
                src={tile.image}
                alt={tile.name}
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {tile.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {tile.collection}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-ink">{tile.views}</p>
              <p className="mt-0.5 text-xs font-semibold text-green-600">
                {tile.selection}% selection
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const TopCustomers = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">Top Customers</h2>
      <Link
        href="/sales/customers"
        className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
      >
        <ExternalLink className="size-3.5" /> View All
      </Link>
    </div>
    <ul className="mt-4">
      {topCustomers.map((customer, index) => (
        <li
          key={customer.slug}
          className={index > 0 ? "border-t border-border" : undefined}
        >
          <Link
            href={`/sales/customers/${customer.slug}`}
            className="flex items-center gap-3 py-4 transition-colors hover:bg-secondary/60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
              {customer.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {customer.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {customer.meta}
              </p>
            </div>
            <span className="shrink-0 font-data text-sm font-semibold text-ink">
              {customer.amount}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

const AnalyticsOverviewPage = () => (
  <>
    <AnalyticsPageHeader
      title="Overview"
      subtitle="High-level performance metrics and trends across the Magnificat ecosystem."
    />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards items={kpis} />
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <RevenueTrendChart title="Sales Overview" subtitle="Revenue Performance" />
        <AiRecommendationChart />
      </div>
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <TopPerformingTiles />
        <TopCustomers />
      </div>
      <ConversionFunnel />
    </div>
  </>
);

export default AnalyticsOverviewPage;
