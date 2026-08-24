"use client";

import { useState } from "react";
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
  ShoppingCart,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Minus,
  Smile,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  UsersRound,
  Coins
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { Badge } from "@/components/ui/badge";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { cn } from "@/lib/utils";
import { salesOrders } from "@/data/sales-orders";
import { inventoryProducts } from "@/data/inventory";

const salesTrendDatasets = {
  "7D": [
    { day: "Mon", value: 12_400_000 },
    { day: "Tue", value: 15_100_000 },
    { day: "Wed", value: 14_200_000 },
    { day: "Thu", value: 18_600_000 },
    { day: "Fri", value: 21_300_000 },
    { day: "Sat", value: 19_800_000 },
    { day: "Sun", value: 17_400_000 },
  ],
  "30D": [
    { day: "Mar 01", value: 12_400_000 },
    { day: "Mar 08", value: 24_800_000 },
    { day: "Mar 15", value: 30_100_000 },
    { day: "Mar 22", value: 30_600_000 },
    { day: "Mar 30", value: 31_200_000 },
  ],
  "3M": [
    { day: "Jan", value: 62_000_000 },
    { day: "Feb", value: 78_500_000 },
    { day: "Mar", value: 92_300_000 },
  ],
  "12M": [
    { day: "Jan", value: 42_000_000 },
    { day: "Mar", value: 51_000_000 },
    { day: "May", value: 58_000_000 },
    { day: "Jul", value: 66_500_000 },
    { day: "Sep", value: 73_000_000 },
    { day: "Nov", value: 81_000_000 },
  ],
} as const;

const kpis = [
  {
    label: "Total Sales (RWF)",
    value: "128.5M",
    trend: "+12%",
    icon: Wallet,
  },
  {
    label: "Total Orders",
    value: "1,029",
    badge: "2.4%",
    icon: ShoppingBasket,
  },
  {
    label: "Total Customers",
    value: "12,450",
    trend: "+8.4%",
    icon: UsersRound,
  },
  {
    label: "Repeat Customers",
    value: "3,120",
    trend: "-1.5%",
    icon: Repeat,
  },
  {
    label: "Inventory",
    value: "8K / 142K",
    warning: "14 Low Stock",
    icon: ShoppingBag,
  },
  {
    label: "Avg. Conversion",
    value: "12%",
    badge: "2.4%",
    icon: Coins,
  },
] as const;

const needsAttention = [
  { label: "Out of Stock", count: 3, icon: Box, tone: "bg-red-50 text-red-600" },
  { label: "Low Stock", count: 14, icon: AlertTriangle, tone: "bg-amber-50 text-amber-600" },
  { label: "Pending Orders", count: 27, icon: Clock3, tone: "bg-slate-100 text-ink" },
];

const journeySteps = [
  { label: "Opened App", value: "12.4k", sub: "100% Volume", conversion: null },
  { label: "Created Room", value: "7.4k", sub: null, conversion: "60%" },
  { label: "Viewed Tile", value: "6.3k", sub: null, conversion: "85%" },
  { label: "Applied Tile", value: "4.4k", sub: null, conversion: "70%" },
  { label: "Saved/Shared", value: "1.7k", sub: null, conversion: "40%" },
  { label: "Purchased", value: "595", sub: "4.8% Final Conv.", conversion: "34%" },
];

const tilePerformance = [
  { label: "Most Viewed", value: "Calacatta Gold Polished", sub: "12.4K views", icon: Eye },
  { label: "Most Applied", value: "Calacatta Gold Polished", sub: "12.4K applications", icon: MousePointerSquareDashed },
  { label: "Most Purchased", value: "Calacatta Gold Polished", sub: "12.4K sales", icon: ShoppingBasket },
  { label: "Avg. Selection Rate", value: "18.4%", badge: "12.4%", icon: MousePointerClick },
  { label: "Avg. Conversion", value: "12%", badge: "2.4%", icon: Wallet },
] as const;

const inventoryOverview = [
  { label: "Total Inventory Value", value: "$1.24M", badge: "2.4%", icon: Wallet },
  { label: "Active Products", value: "842", icon: PackageCheck },
  { label: "Pending Fulfillments", value: "28", icon: Clock3 },
  { label: "Low Stock Items", value: "12", icon: AlertTriangle, warn: true },
] as const;

const urgentItems = [
  {
    id: "urgent-1",
    name: "Nero Marquina",
    collection: "80x80cm Luxury Black Series",
    description: "Deep black marble with striking white lightning veins.",
    image: inventoryProducts[1].image,
    sku: "SLB-NM-042",
    size: "80x80cm",
    currentStock: 45,
    stockLevel: "low" as const,
    unitPrice: "52,000",
    lastUpdated: "Oct 23, 2026",
  },
  {
    id: "urgent-2",
    name: "Carrara White",
    collection: "10x30cm Classic Subway Collection",
    description: "Elegant and versatile tiles for modern kitchen backsplashes.",
    image: inventoryProducts[2].image,
    sku: "SUB-CW-105",
    size: "10x30cm",
    currentStock: 0,
    stockLevel: "critical" as const,
    unitPrice: "12,500",
    lastUpdated: "Oct 20, 2026",
  },
];

const stockDot = { low: "bg-amber-500", critical: "bg-red-500" } as const;
const stockText = { low: "text-amber-600", critical: "text-red-600" } as const;

const recentOrders = salesOrders.slice(0, 3).map((order) => ({
  ...order,
  itemCount: order.items.length,
}));

const orderStatusIcon = {
  Processing: { icon: Clock3, tone: "bg-amber-50 text-amber-600" },
  Shipped: { icon: ShoppingCart, tone: "bg-blue-50 text-blue-600" },
  Delivered: { icon: PackageCheck, tone: "bg-green-50 text-green-600" },
} as const;

const orderStatusBadgeVariant = {
  Processing: "warning",
  Shipped: "primary",
  Delivered: "muted",
} as const;

const orderStatusLabel = {
  Processing: "Pending",
  Shipped: "Shipped",
  Delivered: "Delivered",
} as const;

const aiKpis = [
  { label: "Total Recommendations", value: "1,220,291", change: "12.4%", icon: Sparkles },
  { label: "Acceptance Rate", value: "33.3%", change: "4.2%", icon: ShieldCheck },
  { label: "Avg. Match Score", value: "89.2%", change: "2.4%", icon: TrendingUp },
] as const;

const sentiments = [
  { label: "72%", value: 72, icon: ThumbsUp, bar: "bg-blue-500", chip: "bg-blue-100 text-blue-600" },
  { label: "20%", value: 20, icon: Minus, bar: "bg-muted-foreground/40", chip: "bg-muted-background text-muted-foreground" },
  { label: "8%", value: 8, icon: ThumbsDown, bar: "bg-red-500", chip: "bg-red-100 text-red-600" },
];

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

const KpiCards = () => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      const isNegative = "trend" in kpi && kpi.trend?.startsWith("-");

      return (
        <article key={kpi.label} className="flex h-full flex-col rounded-2xl bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Icon className="size-5 stroke-2 text-ink" />
            {"badge" in kpi ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">
                <TrendingUp className="size-3" />
                {kpi.badge}
              </span>
            ) : "warning" in kpi ? (
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
              {"trend" in kpi && kpi.trend ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-bold",
                    isNegative ? "text-amber-600" : "text-green-600",
                  )}
                >
                  {isNegative ? <TrendingDown className="size-3 stroke-3" /> : <TrendingUp className="size-3 stroke-3" />}
                  {kpi.trend}
                </span>
              ) : null}
            </div>
          </div>
        </article>
      );
    })}
  </div>
);

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
  const [range, setRange] = useState<keyof typeof salesTrendDatasets>("30D");
  const data = salesTrendDatasets[range];
  const totalSales = data.reduce((sum, point) => sum + point.value, 0);
  const totalOrders = 1_202;
  const averageOrder = Math.round(totalSales / totalOrders);

  return (
    <section className="grid gap-5 rounded-2xl bg-card p-5 sm:gap-6 sm:p-6 xl:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Sales Overview</h2>
          <div className="flex h-9 items-center rounded-lg border border-border bg-background p-1">
            {(Object.keys(salesTrendDatasets) as (keyof typeof salesTrendDatasets)[]).map((item) => (
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...data]} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
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
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Total Sales</p>
          <p className="mt-1 text-xl font-black text-ink">RWF 2.3M</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Average Order</p>
          <p className="mt-1 text-xl font-black text-ink">RWF {averageOrder.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Total Orders</p>
          <p className="mt-1 text-xl font-black text-ink">{totalOrders.toLocaleString()}</p>
        </div>
      </div>
    </section>
  );
};

const NeedsAttention = () => (
  <section className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center gap-2">
      <AlertTriangle className="size-4 text-amber-500" />
      <h2 className="text-base font-bold text-ink">Needs Attention</h2>
    </div>
    <ul className="mt-4 flex-1 space-y-2">
      {needsAttention.map((item) => {
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

const CustomerJourneyFunnel = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <h2 className="text-lg font-bold text-ink">Customer Journey Funnel</h2>
    <p className="mt-1 text-sm text-muted-foreground">Conversion rates through the spatial planning flow.</p>
    <div className="scrollbar-hide mt-6 flex gap-6 overflow-x-auto px-2 pb-2">
      {journeySteps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === journeySteps.length - 1;

        return (
          <div key={step.label} className="relative flex shrink-0">
            <div
              className={cn(
                "flex h-40 w-[168px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-5 text-left transition-all duration-200",
                isLast ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {step.label}
              </p>
              <div>
                <p className="text-3xl font-black text-ink">{step.value}</p>
                {step.sub ? (
                  <p className="mt-1 text-xs font-medium text-ink/60">{step.sub}</p>
                ) : !isFirst ? (
                  <p className="mt-1 text-xs font-medium text-ink/60">
                    {step.conversion} conversion
                  </p>
                ) : null}
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

const TilePerformance = () => (
  <section>
    <h2 className="text-lg font-bold text-ink">Tile Performance</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {tilePerformance.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <Icon className="size-5 stroke-2 text-ink" />
              {"badge" in item ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                  <TrendingUp className="size-3" />
                  {item.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              {item.label}
            </p>
            <p className="mt-1 truncate text-xl font-black text-ink">{item.value}</p>
            {"sub" in item ? <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p> : null}
          </article>
        );
      })}
    </div>
  </section>
);

const InventoryOverview = () => (
  <section>
    <h2 className="text-lg font-bold text-ink">Inventory Overview</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {inventoryOverview.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <Icon className={cn("size-5 stroke-2", "warn" in item && item.warn ? "text-amber-500" : "text-ink")} />
              {"badge" in item ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                  <TrendingUp className="size-3" />
                  {item.badge}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-end">
              <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {item.label}
              </p>
              <p className={cn("mt-1 text-3xl font-black", "warn" in item && item.warn ? "text-amber-600" : "text-ink")}>
                {item.value}
              </p>
            </div>
          </article>
        );
      })}
    </div>

    <div className="mt-5 rounded-2xl bg-card p-5 sm:p-6">
      <h3 className="text-base font-bold text-ink">Urgent Items</h3>
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
            {urgentItems.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" sizes="44px" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.collection}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 font-data whitespace-nowrap text-ink">{item.sku}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-ink">{item.size}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className={cn("inline-flex items-center gap-1.5 font-data", stockText[item.stockLevel])}>
                    <span className={cn("size-2 rounded-full", stockDot[item.stockLevel])} />
                    {item.currentStock} pcs
                  </span>
                </td>
                <td className="py-3 pr-4 font-data whitespace-nowrap text-ink">{item.unitPrice}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">{item.lastUpdated}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-ink">
                  12.4K views
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-green-600">
                    <TrendingUp className="size-3.5 stroke-2" /> 18% rate
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const RecentOrders = () => (
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
    <ul className="mt-4 divide-y divide-border">
      {recentOrders.map((order) => {
        const { icon: StatusIcon, tone } = orderStatusIcon[order.status];
        return (
          <li key={order.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone)}>
                <StatusIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-ink">{order.id}</p>
                  <Badge variant={orderStatusBadgeVariant[order.status]}>
                    {orderStatusLabel[order.status]}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {order.customerName} • {order.itemCount} Items
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" /> {order.date}
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
  </section>
);

const AiRecommendations = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center gap-2">
      <Bot className="size-5 text-ink" />
      <h2 className="text-lg font-bold text-ink">AI Recommendations</h2>
    </div>

    <div className="mt-5 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          Feedback Sentiment
        </p>
        <Smile className="size-5 shrink-0 stroke-2 text-ink" />
      </div>
      <div className="mt-4 space-y-2.5">
        {sentiments.map((sentiment) => {
          const Icon = sentiment.icon;
          return (
            <div key={sentiment.label} className="flex items-center gap-2.5">
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
      {aiKpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <article key={kpi.label} className="flex h-full flex-col rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <Icon className="size-5 stroke-2 text-ink" />
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-ink">
                <TrendingUp className="size-3" />
                {kpi.change}
              </span>
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

const AdminDashboardPage = () => (
  <>
    <AdminPageHeader
      title="System Overview"
      subtitle="Real-time status and operational metrics for Magnificat Smart Space infrastructure"
    >
      <HeaderActions />
    </AdminPageHeader>
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards />
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1fr_320px]">
        <SalesOverview />
        <NeedsAttention />
      </div>
      <CustomerJourneyFunnel />
      <TilePerformance />
      <InventoryOverview />
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <RecentOrders />
        <AiRecommendations />
      </div>
    </div>
  </>
);

export default AdminDashboardPage;
