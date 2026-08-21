"use client";

import { useState } from "react";
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
  UserPlus,
  UsersRound,
} from "lucide-react";
import { SalesPageHeader } from "@/app/sales/layout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { salesCustomers } from "@/data/sales-customers";
import { salesOrders, type SalesOrderCreatorType } from "@/data/sales-orders";

const salesPerformanceDatasets = {
  W: [
    { day: "Mon", value: 2_100_000 },
    { day: "Tue", value: 3_400_000 },
    { day: "Wed", value: 2_800_000 },
    { day: "Thu", value: 4_600_000 },
    { day: "Fri", value: 5_200_000 },
    { day: "Sat", value: 3_900_000 },
    { day: "Sun", value: 1_800_000 },
  ],
  M: [
    { day: "Oct 01", value: 6_800_000 },
    { day: "Oct 05", value: 9_400_000 },
    { day: "Oct 10", value: 11_900_000 },
    { day: "Oct 15", value: 11_100_000 },
    { day: "Oct 20", value: 12_400_000 },
    { day: "Oct 25", value: 12_300_000 },
    { day: "Oct 30", value: 12_350_000 },
    { day: "Nov 05", value: 11_000_000 },
    { day: "Nov 10", value: 15_200_000 },
    { day: "Nov 15", value: 18_400_000 },
    { day: "Nov 20", value: 13_400_000 },
  ],
  Y: [
    { day: "Jan", value: 42_000_000 },
    { day: "Feb", value: 51_000_000 },
    { day: "Mar", value: 47_500_000 },
    { day: "Apr", value: 62_000_000 },
    { day: "May", value: 58_000_000 },
    { day: "Jun", value: 71_000_000 },
    { day: "Jul", value: 66_500_000 },
    { day: "Aug", value: 78_000_000 },
    { day: "Sep", value: 73_000_000 },
    { day: "Oct", value: 88_000_000 },
    { day: "Nov", value: 81_000_000 },
    { day: "Dec", value: 95_000_000 },
  ],
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const uniqueCustomers = Array.from(
  new Map(salesCustomers.map((customer) => [customer.slug, customer])).values(),
);

const customers = uniqueCustomers.slice(0, 5).map((customer) => ({
  slug: customer.slug,
  initials: getInitials(customer.name),
  name: customer.name,
  meta: `${customer.orders.length} Orders • Last ${customer.lastOrder}`,
  amount: customer.lifetimeSpend,
}));

const orders = salesOrders.slice(0, 3);

const parseAmount = (amount: string) => Number(amount.replace(/[^0-9]/g, ""));

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1_000_000_000) return `RWF ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(1)}K`;
  return `RWF ${amount.toLocaleString("en-US")}`;
};

const totalSales = salesOrders.reduce((sum, order) => sum + parseAmount(order.amount), 0);
const latestOrder = salesOrders.reduce((latest, order) =>
  new Date(order.date) > new Date(latest.date) ? order : latest,
);
const latestOrderDate = new Date(latestOrder.date);
const latestOrderMonthKey = `${latestOrderDate.getFullYear()}-${latestOrderDate.getMonth()}`;
const latestOrderMonthLabel = latestOrderDate.toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});
const monthlyOrders = salesOrders.filter((order) => {
  const orderDate = new Date(order.date);
  return `${orderDate.getFullYear()}-${orderDate.getMonth()}` === latestOrderMonthKey;
});
const monthlySales = monthlyOrders.reduce((sum, order) => sum + parseAmount(order.amount), 0);

const getSalesBreakdown = (ordersToMeasure: typeof salesOrders) =>
  ordersToMeasure.reduce(
    (breakdown, order) => {
      breakdown[order.createdByType] += parseAmount(order.amount);
      return breakdown;
    },
    { customer: 0, staff: 0 } as Record<SalesOrderCreatorType, number>,
  );

const totalSalesBreakdown = getSalesBreakdown(salesOrders);
const monthlySalesBreakdown = getSalesBreakdown(monthlyOrders);

type ComparisonPoint = {
  day: string;
  customer: number;
  staff: number;
};

const comparisonRatios = {
  W: [0.62, 0.44, 0.7, 0.51, 0.58, 0.39, 0.66],
  M: [0.48, 0.61, 0.55, 0.72, 0.43, 0.64, 0.52, 0.37, 0.68, 0.46, 0.59],
  Y: [0.41, 0.57, 0.49, 0.66, 0.53, 0.72, 0.45, 0.61, 0.38, 0.69, 0.51, 0.63],
} as const;

const createComparisonDataset = <T extends { day: string; value: number }>(
  dataset: readonly T[],
  ratios: readonly number[],
): ComparisonPoint[] =>
  dataset.map(({ day, value }, index) => {
    const customerRatio = ratios[index % ratios.length];
    return {
      day,
      customer: Math.round(value * customerRatio),
      staff: Math.round(value * (1 - customerRatio)),
    };
  });

const comparisonDatasets: Record<"W" | "M" | "Y", ComparisonPoint[]> = {
  W: createComparisonDataset(salesPerformanceDatasets.W, comparisonRatios.W),
  M: createComparisonDataset(salesPerformanceDatasets.M, comparisonRatios.M),
  Y: createComparisonDataset(salesPerformanceDatasets.Y, comparisonRatios.Y),
};

const orderStatusVariants = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
  Pending: "warning",
} as const;

const getOrderStatusVariant = (status: string) =>
  orderStatusVariants[status as keyof typeof orderStatusVariants] ?? "default";

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
      <p className="mt-1 font-data text-sm text-ink">
        Revenue: RWF {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

const ComparisonTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value: number; color?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <div className="mt-2 space-y-1 font-data text-sm text-ink">
        {payload.map((entry) => (
          <p key={entry.name} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name === "customer" ? "Customer-created" : "Staff-created"}
            </span>
            <span>RWF {entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

const SalesChart = () => {
  const [range, setRange] = useState<keyof typeof salesPerformanceDatasets>("M");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = salesPerformanceDatasets[range];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Sales Performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue (RWF) across selected period
          </p>
        </div>
        <div className="flex gap-2">
          {(["W", "M", "Y"] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={`size-8 rounded-md text-xs font-semibold transition-all ${range === item ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-card text-ink hover:bg-secondary"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap="30%"
            margin={{ top: 8, right: 4, left: 0, bottom: 24 }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="day"
              angle={-40}
              textAnchor="end"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{
                fill: "var(--data-ink)",
                fontSize: 11,
                fontFamily: "var(--font-data)",
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) =>
                value === 0 ? "0" : `${value / 1_000_000}M`
              }
              tick={{
                fill: "var(--data-ink)",
                fontSize: 11,
                fontFamily: "var(--font-data)",
              }}
            />
            <Tooltip cursor={{ fill: "transparent" }} content={<RevenueTooltip />} />
            <Bar
              dataKey="value"
              barSize="70%"
              radius={[2, 2, 0, 0]}
              animationDuration={700}
              onMouseEnter={(_, index) => setHovered(index)}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill="var(--chart-blue)"
                  fillOpacity={hovered === null || hovered === index ? 1 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="size-3 rounded-sm bg-chart-blue" />
        <span className="font-data text-sm text-data-ink">Sales Performance</span>
      </div>
    </section>
  );
};

const SalesCreatorComparisonChart = () => {
  const [range, setRange] = useState<keyof typeof comparisonDatasets>("M");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = comparisonDatasets[range];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Sales by Order Creator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare customer-created and staff-created sales
          </p>
        </div>
        <div className="flex gap-2">
          {(["W", "M", "Y"] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={`size-8 rounded-md text-xs font-semibold transition-all ${range === item ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-card text-ink hover:bg-secondary"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="4%" barGap={6} margin={{ top: 8, right: 4, left: 0, bottom: 24 }} onMouseLeave={() => setHovered(null)}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
            <XAxis dataKey="day" angle={-40} textAnchor="end" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }} />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value: number) => value === 0 ? "0" : `${value / 1_000_000}M`} tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }} />
            <Tooltip cursor={{ fill: "transparent" }} content={<ComparisonTooltip />} />
            <Bar dataKey="customer" name="customer" fill="var(--chart-blue)" radius={[2, 2, 0, 0]} animationDuration={700} onMouseEnter={(_: unknown, index: number) => setHovered(index)}>
              {data.map((_, index) => <Cell key={`customer-${index}`} fill="var(--chart-blue)" fillOpacity={hovered === null || hovered === index ? 1 : 0.45} />)}
            </Bar>
            <Bar dataKey="staff" name="staff" fill="var(--primary)" radius={[2, 2, 0, 0]} animationDuration={700} onMouseEnter={(_: unknown, index: number) => setHovered(index)}>
              {data.map((_, index) => <Cell key={`staff-${index}`} fill="var(--primary)" fillOpacity={hovered === null || hovered === index ? 1 : 0.45} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="size-3 rounded-sm bg-chart-blue" />
        <span className="font-data text-sm text-data-ink">Customer-created</span>
        <span className="ml-3 size-3 rounded-sm bg-primary" />
        <span className="font-data text-sm text-data-ink">Staff-created</span>
      </div>
    </section>
  );
};

const Kpis = () => {
  const cards = [
    { label: "Total Sales", value: totalSales, breakdown: totalSalesBreakdown, icon: Coins, note: "All recorded orders", iconBackground: "bg-[#FAFDE9]" },
    { label: "Active Customers", value: "42", breakdown: undefined, icon: UsersRound, note: "3 new this week", iconBackground: "bg-[#F3F4F6]" },
    { label: "Pending Orders", value: "12", breakdown: undefined, icon: Clock3, note: "Requires attention", iconBackground: "bg-[#FEF3C7]" },
    { label: "Monthly Sales", value: monthlySales, breakdown: monthlySalesBreakdown, icon: Coins, note: `Based on ${latestOrderMonthLabel}`, iconBackground: "bg-[#FAFDE9]" },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const { label, value, breakdown, icon: Icon, note, iconBackground } = card;
        return (
        <article
          key={label}
          className="group cursor-pointer rounded-xl bg-white p-5 transition-all duration-200 ease-out active:scale-95 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm text-ink uppercase">
              {label}
            </p>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-ink ${iconBackground}`}>
              <Icon className="size-4" strokeWidth={1.8} />
            </span>
          </div>
          <p className="mt-4 wrap-break-word text-2xl font-bold text-ink">
            {typeof value === "number" ? formatCompactCurrency(value) : value}
          </p>
          {breakdown && (
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Customer-created</span>
                <span className="font-data font-semibold text-ink">{formatCompactCurrency(breakdown.customer)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Staff-created</span>
                <span className="font-data font-semibold text-ink">{formatCompactCurrency(breakdown.staff)}</span>
              </div>
            </div>
          )}
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">
            {note}
          </p>
        </article>
        );
      })}
    </div>
  );
};

const SalesOverviewPage = () => {
  const router = useRouter();

  return (
    <>
      <SalesPageHeader
        title="Overview"
        subtitle="Track your sales performance and daily tasks."
        action={{ label: "Add Customer", icon: UserPlus }}
      />
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <Kpis />
        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <SalesChart />
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Top Customers</h2>
          <ul className="mt-4 flex-1">
              {customers.map((customer) => (
                <li
                  key={customer.slug}
                  className="border-b border-[#E5E7EB]"
                >
                  <Link
                    href={`/sales/customers/${customer.slug}`}
                    className="group flex min-w-0 items-start gap-3 px-2 py-4 transition-colors hover:bg-secondary/60"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card transition-transform duration-200 group-hover:scale-110">
                      {customer.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{customer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{customer.meta}</p>
                    </div>
                    <span className="max-w-[38%] shrink-0 wrap-break-word text-right font-data text-sm font-semibold text-ink">
                      {customer.amount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/sales/customers"
              className="mt-2 block w-full rounded-lg py-3 text-center text-sm font-medium text-ink transition-all duration-200 hover:bg-secondary active:scale-[0.98]"
            >
              View All
            </Link>
          </section>
        </div>
        <SalesCreatorComparisonChart />
        <section className="animate-fade-in overflow-hidden rounded-2xl bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <h2 className="truncate text-lg font-bold text-ink">
              Recent Orders
            </h2>
            <Link
              href="/sales/orders"
              className="group flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wider text-ink"
            >
              VIEW ALL
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Order ID",
                    "Customer",
                    "Date",
                    "Amount",
                    "Status",
                    "Action",
                  ].map((head) => (
                    <TableHead key={head}>
                      {head}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    tabIndex={0}
                    aria-label={`View details for ${order.id}`}
                    onClick={() => router.push(`/sales/orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/sales/orders/${order.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-semibold text-ink"><Link href={`/sales/orders/${order.id}`} className="hover:underline">{order.id}</Link></TableCell>
                    <TableCell className="text-ink">{order.customerName}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink">
                      {order.date}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap text-ink">
                      {order.amount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales/orders/${order.id}`} aria-label={`View ${order.id}`} className="rounded-md p-1.5 text-ink hover:bg-secondary"><MoreVertical className="size-4" /></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border md:hidden">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-start justify-between gap-3 px-5 py-4 font-data"
              >
                <Link href={`/sales/orders/${order.id}`} className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{order.id}</p>
                    <p className="truncate text-sm text-ink">{order.customerName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-semibold text-ink">{order.amount}</p>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
};

export default SalesOverviewPage;
