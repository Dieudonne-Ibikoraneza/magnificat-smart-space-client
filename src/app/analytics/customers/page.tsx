"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ListFilter,
  Repeat2,
  Search,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBarChart } from "@/components/category-bar-chart";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { KpiCards, type KpiCardData } from "@/components/kpi-cards";
import { salesCustomers } from "@/data/sales-customers";

const kpis: KpiCardData[] = [
  { label: "Total Customers", value: "12,450", icon: UsersRound, trend: "+8.4%" },
  { label: "New Customers", value: "842", icon: UserRoundPlus, trend: "+12%" },
  { label: "Repeat Customers", value: "3,120", icon: Repeat2, trend: "-1.5%" },
  { label: "Repeat Purchase Rate", value: "25.1%", icon: Repeat2, trend: "+0.8%" },
];

const projectTypes = [
  { category: "Living Room", value: 4_200 },
  { category: "Bathroom", value: 9_500 },
  { category: "Kitchen", value: 7_029 },
  { category: "Bedroom", value: 8_500 },
];

const customerTrend = [
  { month: "Jan", newCustomers: 20, repeatCustomers: 12 },
  { month: "Feb", newCustomers: 35, repeatCustomers: 22 },
  { month: "Mar", newCustomers: 48, repeatCustomers: 30 },
  { month: "Apr", newCustomers: 42, repeatCustomers: 45 },
  { month: "May", newCustomers: 55, repeatCustomers: 38 },
  { month: "Jun", newCustomers: 62, repeatCustomers: 44 },
  { month: "Jul", newCustomers: 58, repeatCustomers: 40 },
  { month: "Aug", newCustomers: 70, repeatCustomers: 48 },
  { month: "Sep", newCustomers: 85, repeatCustomers: 52 },
  { month: "Oct", newCustomers: 78, repeatCustomers: 58 },
  { month: "Nov", newCustomers: 65, repeatCustomers: 50 },
  { month: "Dec", newCustomers: 60, repeatCustomers: 46 },
];

const journeyDropOff = [
  { label: "System Opened", value: 18_800, conversion: "" },
  { label: "Browse Products", value: 8_300, conversion: "45%" },
  { label: "Room Created", value: 7_900, conversion: "91%" },
  { label: "Dimensions Entered", value: 7_808, conversion: "96%" },
  { label: "Tile Applied", value: 7_800, conversion: "99.7%" },
  { label: "Design Saved/Shared", value: 1_004, conversion: "12.12%" },
  { label: "Quotation Generation", value: 100, conversion: "10.04%" },
  { label: "Order Placed", value: 14, conversion: "14%" },
];

const acquisitionChannels = [
  { category: "Social Media", value: 5_200 },
  { category: "Search Engine", value: 9_500 },
  { category: "Referral", value: 7_029 },
  { category: "Other", value: 8_300 },
];

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

const CustomerTrendChart = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">New vs. Repeat Customers Over Time</h2>
        <p className="mt-1 text-sm text-muted-foreground">12-month comparison</p>
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
        <LineChart data={customerTrend} margin={{ top: 8, right: 4, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis
            dataKey="month"
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
          <Tooltip cursor={{ stroke: "var(--border)" }} content={<CustomerTrendTooltip />} />
          <Line type="monotone" dataKey="newCustomers" name="newCustomers" stroke="#d1d5db" strokeWidth={2} dot={false} animationDuration={700} />
          <Line type="monotone" dataKey="repeatCustomers" name="repeatCustomers" stroke="var(--primary)" strokeWidth={2.5} dot={false} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
);

const JourneyDropOff = () => {
  const maxValue = Math.max(...journeyDropOff.map((step) => step.value));

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">Customer Journey Drop-Off</h2>
      <p className="mt-1 text-sm text-muted-foreground">Funnel analysis across key stages</p>
      <div className="mt-7 space-y-4">
        {journeyDropOff.map((step) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 4);

          return (
            <div key={step.label} className="flex items-center font-data gap-3 text-sm justify-between">
              <p className="w-32 shrink-0 text-right font-data font-medium text-ink sm:w-40">
                {step.label}
              </p>
              <div className="min-w-8 flex-1">
                <div
                  className="h-6 bg-chart-blue transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="shrink-0 text-right text-lg font-extrabold text-ink">
                  {step.value.toLocaleString()}
                </p>
                <p className="shrink-0 text-right text-xs font-black text-green-600">
                  {step.conversion}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CustomersDirectory = () => {
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("spend-desc");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = salesCustomers.filter(
      (customer) =>
        (status === "all" || customer.status.toLowerCase() === status) &&
        (normalizedQuery === "" ||
          customer.name.toLowerCase().includes(normalizedQuery) ||
          customer.email.toLowerCase().includes(normalizedQuery)),
    );

    return sort === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered;
  }, [query, sort, status]);

  return (
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
              <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">
                    {(value) =>
                      value === "active" ? "Status: Active" : value === "inactive" ? "Status: Inactive" : "Status: All"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="active">Status: Active</SelectItem>
                  <SelectItem value="inactive">Status: Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <span className="sr-only">Total spend</span>
              <Select value={sort} onValueChange={(value) => setSort(value ?? "spend-desc")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="min-w-0 truncate">
                    {(value) => (value === "name" ? "Name: A - Z" : "Total Spend: Highest")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend-desc">Total Spend: Highest</SelectItem>
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
            Showing {results.length} result{results.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          No customers match your filters.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((customer) => (
            <li key={customer.slug} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate text-xl font-bold text-ink">{customer.name}</h3>
                <Badge variant={customer.status === "Active" ? "primary" : "warning"}>
                  {customer.status}
                </Badge>
              </div>
              <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Contact</dt>
                  <dd className="min-w-0 text-right font-data text-ink">
                    <span className="block truncate">{customer.email}</span>
                    <span className="block whitespace-nowrap">{customer.phone}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last Order</dt>
                  <dd className="whitespace-nowrap font-data text-ink">{customer.lastOrder}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Total Orders</dt>
                  <dd className="whitespace-nowrap font-data text-ink">15</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                  <dt className="text-muted-foreground">Total Spend</dt>
                  <dd className="font-data text-xl font-semibold whitespace-nowrap text-ink">
                    {customer.totalSpend}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/sales/customers/${customer.slug}`}
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

const AnalyticsCustomersPage = () => (
  <>
    <AnalyticsPageHeader title="Customer Analytics" subtitle="Customer insights and engagement trends." />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards items={kpis} />
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <CategoryBarChart
          title="Project Types Distribution"
          subtitle="Distribution of customer projects by category, Number of customers vs. Project Type"
          data={projectTypes}
          tooltipLabel="Customers"
          tooltipValueFormatter={(value) => value.toLocaleString()}
          yTicks={[0, 1_000, 5_000, 10_000, 20_000]}
          yDomainMax={20_000}
          yTickFormatter={(value) => value.toLocaleString()}
        />
        <CustomerTrendChart />
      </div>
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <JourneyDropOff />
        <CategoryBarChart
          title="Acquisition Channel"
          subtitle="Customers by Source of Discovery"
          data={acquisitionChannels}
          tooltipLabel="Customers"
          tooltipValueFormatter={(value) => value.toLocaleString()}
          yTicks={[0, 1_000, 5_000, 10_000, 20_000]}
          yDomainMax={20_000}
          yTickFormatter={(value) => value.toLocaleString()}
          uppercaseTooltipLabel
        />
      </div>
      <CustomersDirectory />
    </div>
  </>
);

export default AnalyticsCustomersPage;
