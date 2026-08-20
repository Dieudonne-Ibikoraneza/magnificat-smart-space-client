"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Calculator,
  Eye,
  LogIn,
  Menu,
  Repeat2,
  RefreshCw,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useStockMenu } from "@/app/stock/layout";
import { Button } from "@/components/ui/button";

const chartData = {
  7: [
    2_100_000, 3_400_000, 2_800_000, 4_600_000, 5_200_000, 3_900_000, 1_800_000,
  ].map((value, index) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
    value,
  })),
  30: [
    6_800_000, 9_400_000, 11_900_000, 11_100_000, 12_400_000, 12_300_000,
    12_350_000, 11_000_000, 15_200_000, 18_400_000, 13_400_000,
  ].map((value, index) => ({
    day: [
      "Oct 01",
      "Oct 05",
      "Oct 10",
      "Oct 15",
      "Oct 20",
      "Oct 25",
      "Oct 30",
      "Nov 05",
      "Nov 10",
      "Nov 15",
      "Nov 20",
    ][index],
    value,
  })),
  12: [
    42_000_000, 51_000_000, 47_500_000, 62_000_000, 58_000_000, 71_000_000,
    66_500_000, 78_000_000, 73_000_000, 88_000_000, 81_000_000, 95_000_000,
  ].map((value, index) => ({
    day: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][index],
    value,
  })),
};

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
      <p className="text-xs font-semibold tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink">
        Revenue: RWF {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

const funnel = [
  ["System Open", "Sessions started", "5,240", "", LogIn],
  ["Account Registration / Login", "", "4,892", "93% conversion", UsersRound],
  ["Product Catalog Browsing", "", "4,520", "92% conversion", Eye],
  ["Product Detail Views", "", "3,812", "84% conversion", Eye],
  ["Calculator Usage", "", "2,450", "64% conversion", Calculator],
  ["3D Room Visualizer Open", "", "1,945", "79% conversion", Sparkles],
  ["Tile Design Applied", "", "1,420", "73% conversion", BarChart3],
  ["Designs Saved / Shared", "", "1,105", "77% conversion", Share2],
  ["Final Orders Placed", "", "842", "76% conversion", Repeat2],
] as const;

export default function StockReportsPage() {
  const { openMenu } = useStockMenu();
  const [period, setPeriod] = useState<7 | 30 | 12>(30);
  const data = useMemo(() => chartData[period], [period]);

  return (
    <div className="mx-auto w-full max-w-[1070px]">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-ink lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">
              Reports
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted sm:text-base">
              Comprehensive analytics and performance metrics for the Magnificat
              ecosystem.
            </p>
          </div>
        </div>
        <div className="flex h-11 items-center rounded-xl border border-[#edf0eb] bg-white p-1 shadow-sm gap-1">
          {(
            [
              [7, "7 DAYS"],
              [30, "30 DAYS"],
              [12, "12 MONTHS"],
            ] as const
          ).map(([value]) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              onClick={() => setPeriod(value)}
              className={`h-9 min-w-14 rounded-lg px-2 text-[10px] font-bold leading-3 tracking-wide transition-colors sm:min-w-18 ${period === value ? "bg-ink text-primary hover:bg-ink/80 hover:text-primary/80" : "text-[#514c4d] hover:bg-[#f5f5f5]"}`}
            >
              <span>
                {value === 12 ? (
                  <>
                    12
                    <br />
                    MONTHS
                  </>
                ) : (
                  <>
                    {value}
                    <br />
                    DAYS
                  </>
                )}
              </span>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-1 h-8 w-10 cursor-default rounded-none border-0 border-l border-border pl-2 text-[#514c4d] hover:bg-transparent hover:text-[#514c4d] focus-visible:ring-0"
          >
            <CalendarDays className="size-5" />
          </Button>
        </div>
      </header>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">Sales Overview</h2>
              <p className="text-sm text-muted">Revenue Performance</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-widest text-muted uppercase">
                Total Sales
              </p>
              <p className="text-4xl font-black text-ink sm:text-5xl">
                RWF 24.5M
              </p>
              <p className="mt-1 text-xs font-bold text-green-600">
                ↗ +12.4% vs last period
              </p>
            </div>
          </div>
          <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 4, left: 0, bottom: 24 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e6e9e6"
                />
                <XAxis
                  dataKey="day"
                  angle={-40}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  tick={{
                    fill: "var(--data-ink)",
                    fontSize: 11,
                    fontFamily: "var(--font-data)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={44}
                  tick={{
                    fill: "var(--data-ink)",
                    fontSize: 11,
                    fontFamily: "var(--font-data)",
                  }}
                  tickFormatter={(value: number) =>
                    value === 0 ? "0" : `${value / 1_000_000}M`
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<RevenueTooltip />}
                />
                <Bar
                  dataKey="value"
                  fill="var(--chart-blue)"
                  barSize="70%"
                  radius={[2, 2, 0, 0]}
                  animationDuration={700}
                />
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
        <div className="grid items-start content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <section className="h-fit self-start rounded-[14px] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Bot className="size-6 text-ink" />
              <h2 className="text-xl font-bold text-ink">
                AI Design Assistant
              </h2>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted">
                  Recommendation Acceptance
                </p>
                <p className="mt-2 text-4xl font-black text-ink">82%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted">
                  Avg. Match Score
                </p>
                <p className="mt-2 text-4xl font-black text-ink">
                  4.8<span className="text-base text-muted">/5</span>
                </p>
              </div>
            </div>
          </section>
          <section className="h-fit self-start rounded-[14px] bg-linear-to-br from-ink to-[#304f3f] p-7 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-widest uppercase">
                Repeat Purchase Rate
              </p>
              <RefreshCw className="size-7 text-primary" />
            </div>
            <p className="mt-2 text-5xl font-black text-primary">68%</p>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink">Conversion Funnel</h2>
        <p className="mt-1 text-sm text-muted">
          User progression through the digital catalog
        </p>
        <div className="mt-7 space-y-3">
          {funnel.map(([title, subtitle, count, conversion, Icon], index) => (
            <div
              key={title}
              style={{
                marginLeft: `${index * 12}px`,
                width: `calc(100% - ${index * 12}px)`,
              }}
              className={`group relative flex items-center gap-3 transition-all duration-300 ease-in-out will-change-transform ${index > 0 && index < funnel.length - 1 ? "cursor-pointer hover:-translate-y-1 hover:scale-[1.01]" : index === 0 ? "cursor-not-allowed" : "cursor-default"}`}
            >
              <div
                className={`z-10 flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${index === funnel.length - 1 ? "bg-ink text-primary" : index === 0 ? "bg-muted-background text-muted" : "bg-muted-background text-muted group-hover:bg-primary group-hover:text-ink group-hover:shadow-[0_4px_12px_rgba(196,241,0,0.35)]"}`}
              >
                <Icon className="size-4" />
              </div>
              <div
                className={`flex min-h-12 min-w-0 w-full flex-1 items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out ${index === funnel.length - 1 ? "border-ink bg-ink text-white" : index === 0 ? "border-[#E8E8E8] bg-[#F3F3F3] shadow-none" : "border-[#E8E8E8] bg-[#F3F3F3] shadow-none group-hover:border-primary group-hover:bg-primary/10 group-hover:shadow-[0_6px_18px_rgba(15,39,71,0.08)]"}`}
              >
                <div>
                  <p
                    className={`text-xs font-extrabold tracking-widest uppercase ${index === funnel.length - 1 ? "text-primary" : "text-ink"}`}
                  >
                    {title}
                  </p>
                  {subtitle && (
                    <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-muted uppercase">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold leading-none">
                    {count}
                  </p>
                  {conversion && (
                    <p
                      className={`mt-1 text-[10px] font-extrabold tracking-widest uppercase ${index === funnel.length - 1 ? "text-white/70" : "text-muted"}`}
                    >
                      {conversion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
