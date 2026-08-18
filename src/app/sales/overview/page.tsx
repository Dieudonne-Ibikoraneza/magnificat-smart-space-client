"use client";

import { useState } from "react";
import Link from "next/link";
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
  Menu,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useSalesMenu } from "@/app/sales/layout";
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

const datasets = {
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

const orders = [
  [
    "ORD-092",
    "Vision City Villas",
    "Oct 24, 2026",
    "RWF 12,400,000",
    "Processing",
  ],
  ["ORD-091", "Norrsken House", "Oct 22, 2026", "RWF 8,250,000", "Shipped"],
  [
    "ORD-090",
    "Kigali Heights Corp.",
    "Oct 20, 2026",
    "RWF 45,000,020",
    "Delivered",
  ],
];

const orderStatusVariants = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
  Pending: "warning",
} as const;

const getOrderStatusVariant = (status: string) =>
  orderStatusVariants[status as keyof typeof orderStatusVariants] ?? "default";

const ChartTooltip = ({
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
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">
        {label}
      </p>
      <p className="mt-1 font-data text-sm text-ink">
        Revenue: RWF {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

const SalesChart = () => {
  const [range, setRange] = useState<keyof typeof datasets>("M");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = datasets[range];

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
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={<ChartTooltip />}
            />
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
        <span className="font-data text-sm text-data-ink">
          Sales Performance
        </span>
      </div>
    </section>
  );
};

const Kpis = () => {
  const cards = [
    [
      "Total Sales (YTD)",
      "RWF 128,500,00",
      Coins,
      "+14%",
      "vs last month",
      "bg-[#FAFDE9]",
    ],
    ["Active Customers", "42", UsersRound, "", "3 new this week", "bg-[#F3F4F6]"],
    ["Pending Orders", "12", Clock3, "", "Requires attention", "bg-[#FEF3C7]"],
    ["Monthly Sales", "RWF 128,500,00", Coins, "+14%", "vs last month", "bg-[#FAFDE9]"],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, trend, note, iconBackground]) => (
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
            {value}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">
            {trend && (
              <>
                <TrendingUp className="size-4 text-primary" strokeWidth={2.2} />
                <span className="font-semibold text-primary">{trend}</span>
              </>
            )}
            {note}
          </p>
        </article>
      ))}
    </div>
  );
};

const SalesOverviewPage = () => {
  const { openMenu } = useSalesMenu();

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={openMenu}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">
              Overview
            </h1>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
              Track your sales performance and daily tasks.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6 sm:py-3.5"
        >
          <UserPlus className="size-5" strokeWidth={1.9} />
          <span className="whitespace-nowrap">Add Customer</span>
        </button>
      </header>
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
        <section className="animate-fade-in overflow-hidden rounded-2xl bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <h2 className="truncate text-lg font-bold text-ink">
              Recent Orders
            </h2>
            <button
              type="button"
              className="group flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wider text-ink"
            >
              VIEW ALL
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
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
                {orders.map(([id, customer, date, amount, status]) => (
                  <TableRow
                    key={id}
                    
                  >
                    <TableCell className="font-semibold text-ink">{id}</TableCell>
                    <TableCell className="text-ink">{customer}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink">
                      {date}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap text-ink">
                      {amount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOrderStatusVariant(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        aria-label={`Actions for ${id}`}
                        className="rounded-md p-1.5 text-ink hover:bg-secondary"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border md:hidden">
            {orders.map(([id, customer, date, amount, status]) => (
              <li
                key={id}
                className="flex items-start justify-between gap-3 px-5 py-4 font-data"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{id}</p>
                  <p className="text-sm text-ink">{customer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{date}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-sm font-semibold text-ink">{amount}</p>
                    <Badge variant={getOrderStatusVariant(status)}>
                      {status}
                    </Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
};

export default SalesOverviewPage;
