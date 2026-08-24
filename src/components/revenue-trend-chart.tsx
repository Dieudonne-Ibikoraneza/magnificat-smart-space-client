"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { cn } from "@/lib/utils";

const revenueDatasets = {
  WEEKLY: [
    { day: "Mon", value: 6_000_000 },
    { day: "Tue", value: 8_100_000 },
    { day: "Wed", value: 11_200_000 },
    { day: "Thu", value: 10_400_000 },
    { day: "Fri", value: 14_100_000 },
    { day: "Sat", value: 19_000_000 },
    { day: "Sun", value: 13_300_000 },
  ],
  MONTHLY: [
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
  YEARLY: [
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
} as const;

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

export const RevenueTrendChart = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const [range, setRange] = useState<keyof typeof revenueDatasets>("WEEKLY");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = revenueDatasets[range];

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex h-9 items-center rounded-lg border border-border bg-background p-1">
          {(["WEEKLY", "MONTHLY", "YEARLY"] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={cn(
                "h-7 rounded-md px-3 text-[10px] font-bold tracking-wide transition-colors",
                range === item
                  ? "bg-ink text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data]}
            barCategoryGap="30%"
            margin={{ top: 8, right: 4, left: 0, bottom: 24 }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
            <XAxis
              dataKey="day"
              angle={-40}
              textAnchor="end"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={ChartAxisTick}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 1_000_000}M`)}
              tick={ChartAxisTick}
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
    </section>
  );
};
