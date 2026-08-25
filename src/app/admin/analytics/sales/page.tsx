"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { AdminPageHeader } from "@/app/admin/layout";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBarChart } from "@/components/category-bar-chart";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { cn } from "@/lib/utils";
import { products } from "@/data/catalog";
import { salesOrders, type SalesOrderStatus } from "@/data/sales-orders";

type SalesKpi =
  | {
      label: string;
      value: string;
      icon: typeof Wallet;
      trend: string;
    }
  | {
      label: string;
      value: string;
      icon: typeof Wallet;
      badge: string;
      subtitle: string;
    };

const kpis: SalesKpi[] = [
  { label: "Total Sales", value: "RWF 145.2M", icon: Wallet, trend: "+12.4%" },
  { label: "Average Order Value", value: "RWF 84,200", icon: ShoppingBasket, trend: "+4.2%" },
  { label: "Total Orders", value: "1,029", icon: ShoppingBasket, trend: "-2.4%" },
  {
    label: "Best Selling Tile",
    value: "Calacatta Gold Polished",
    icon: Target,
    badge: "Top Performer",
    subtitle: "24% of total revenue",
  },
];

const projectTypeRevenue = [
  { category: "Living Room", value: 10_200_000 },
  { category: "Bathroom", value: 13_500_000 },
  { category: "Kitchen", value: 12_348_000 },
  { category: "Bedroom", value: 13_800_000 },
];

const topPerformingTiles = products.slice(0, 3).map((product, index) => ({
  ...product,
  revenue: ["RWF 34.2M", "RWF 34.2M", "RWF 32.2M"][index],
  units: 92,
}));

const topAppliedTiles = products.slice(3, 6).map((product, index) => ({
  ...product,
  size: ["60x60cm", "30x60cm", "15x90cm"][index],
  units: [420, 80, 92][index],
}));

const orderStatusVariants: Record<SalesOrderStatus, NonNullable<BadgeProps["variant"]>> = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
};

const recentOrders = salesOrders.slice(0, 6);

const KpiCard = (kpi: SalesKpi) => {
  const Icon = kpi.icon;

  return (
    <article className="flex flex-col h-full rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <Icon className="size-5 stroke-2 text-ink" />
        {"trend" in kpi ? (
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
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            {kpi.badge}
          </span>
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
    </article>
  );
};

const KpiCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {kpis.map((kpi) => (
      <KpiCard key={kpi.label} {...kpi} />
    ))}
  </div>
);

const TopPerformingTiles = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">Top Performing Tiles</h2>
        <p className="mt-1 text-sm text-muted-foreground">By revenue volume</p>
      </div>
      <Link
        href="/admin/analytics/tiles"
        className="flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-ink hover:underline"
      >
        <ExternalLink className="size-3.5" /> View All
      </Link>
    </div>
    <ul className="mt-4">
      {topPerformingTiles.map((tile, index) => (
        <li key={tile.id} className={index > 0 ? "border-t border-border" : undefined}>
          <div className="flex items-center gap-3 py-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
              <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
              <p className="truncate text-xs text-muted-foreground">{tile.collection}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-data text-sm font-semibold text-ink">{tile.revenue}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{tile.units} units</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const TopAppliedTiles = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">Top Applied Tiles</h2>
        <p className="mt-1 text-sm text-muted-foreground">By selection rate in rooms display.</p>
      </div>
      <Link
        href="/admin/analytics/tiles"
        className="flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-ink hover:underline"
      >
        <ExternalLink className="size-3.5" /> View All
      </Link>
    </div>
    <ul className="mt-4">
      {topAppliedTiles.map((tile, index) => (
        <li key={tile.id} className={index > 0 ? "border-t border-border" : undefined}>
          <div className="flex items-center gap-3 py-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
              <Image src={tile.image} alt={tile.name} fill unoptimized className="object-cover" sizes="56px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{tile.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {tile.collection} . {tile.size}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-data text-sm font-semibold text-ink">12.4K Applications</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{tile.units} units</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const RecentOrders = () => {
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("spend-desc");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = recentOrders.filter(
      (order) =>
        (status === "all" || order.status.toLowerCase() === status) &&
        (normalizedQuery === "" ||
          order.customerName.toLowerCase().includes(normalizedQuery) ||
          order.id.toLowerCase().includes(normalizedQuery)),
    );

    return sort === "oldest" ? [...filtered].reverse() : filtered;
  }, [query, sort, status]);

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">Recent Orders</h2>
      <p className="mt-1 text-sm text-muted-foreground">Latest Orders across all channels</p>

      <div className="mt-5 rounded-2xl bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
            <ListFilter className="size-5 shrink-0" strokeWidth={1.8} />
            <span>Filter by:</span>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
            <div className="min-w-0">
              <span className="sr-only">Status</span>
              <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">
                    {(value) =>
                      value === "processing"
                        ? "Status: Processing"
                        : value === "shipped"
                          ? "Status: Shipped"
                          : value === "delivered"
                            ? "Status: Delivered"
                            : "Status: All"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="processing">Status: Processing</SelectItem>
                  <SelectItem value="shipped">Status: Shipped</SelectItem>
                  <SelectItem value="delivered">Status: Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <span className="sr-only">Total spend</span>
              <Select value={sort} onValueChange={(value) => setSort(value ?? "spend-desc")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">
                    {(value) => (value === "oldest" ? "Order Date: Oldest" : "Total Spend: Highest")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend-desc">Total Spend: Highest</SelectItem>
                  <SelectItem value="oldest">Order Date: Oldest</SelectItem>
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
              aria-label="Search orders"
              className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <p className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:hidden xl:inline">
            Showing {results.length} result{results.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          No orders match your filters.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((order) => (
            <li key={order.id} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-data text-xs text-muted-foreground">#{order.id}</p>
                  <h3 className="mt-0.5 truncate text-xl font-bold text-ink">{order.customerName}</h3>
                </div>
                <Badge variant={orderStatusVariants[order.status]}>{order.status}</Badge>
              </div>
              <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Summary</dt>
                  <dd className="min-w-0 text-right font-data text-ink">
                    <span className="block">{order.items.length} Product types</span>
                    <span className="block whitespace-nowrap">{order.totalVolume}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Order Date</dt>
                  <dd className="whitespace-nowrap font-data text-ink">{order.date}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                  <dt className="text-muted-foreground">Total Spend</dt>
                  <dd className="font-data text-xl font-semibold whitespace-nowrap text-ink">{order.amount}</dd>
                </div>
              </dl>
              <Link
                href={`/admin/orders/${order.id}`}
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
  );
};

const AdminAnalyticsSalesPage = () => (
  <>
    <AdminPageHeader
      title="Sales Analytics"
      subtitle="Review revenue performances, order trends and top-selling products."
    />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards />
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <RevenueTrendChart title="Revenue Trends" subtitle="Total Sales over selected period in RWF" />
        <CategoryBarChart
          title="Project Types"
          subtitle="Revenue distribution across room types"
          data={projectTypeRevenue}
          tooltipLabel="Revenue"
          tooltipValueFormatter={(value) => `RWF ${value.toLocaleString()}`}
          yTicks={[0, 5_000_000, 10_000_000, 15_000_000, 20_000_000]}
          yDomainMax={20_000_000}
          yTickFormatter={(value) => (value === 0 ? "0" : `${value / 1_000_000}M`)}
        />
      </div>
      <div className="grid gap-5 grid-cols-1 sm:gap-6 xl:grid-cols-2">
        <TopPerformingTiles />
        <TopAppliedTiles />
      </div>
      <RecentOrders />
    </div>
  </>
);

export default AdminAnalyticsSalesPage;
