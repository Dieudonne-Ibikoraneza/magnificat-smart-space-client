"use client";

import { useState } from "react";
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
import { ChartAxisTick } from "@/components/chart-axis-tick";
import type { CreatorTrendPoint } from "@/lib/api/types";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const CreatorTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value: number; color?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <div className="mt-2 space-y-1 font-data text-sm text-ink">
        {payload.map((entry) => (
          <p key={entry.dataKey} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.dataKey === "customer" ? "Customer-placed" : "Staff-placed"}
            </span>
            <span>{formatRWF(entry.value)}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

/**
 * Grouped bars comparing customer-placed vs staff-placed order revenue per
 * period bucket — fed by `SalesAnalytics.creatorTrend`/`AnalyticsOverview.creatorTrend`,
 * so it tracks whatever period the page's own switcher has selected rather
 * than carrying a range toggle of its own.
 *
 * Deliberately headless (no card chrome) — like `SalesTrendChart` on the
 * Sales Overview page, the caller supplies its own container, since each
 * dashboard it appears on (admin, sales, analyst) lays that container out
 * differently.
 */
export const OrdersByCreatorChart = ({
  data,
  className,
}: {
  data: CreatorTrendPoint[];
  className?: string;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className={className}>
      <div>
        <h2 className="text-lg font-bold text-ink">Orders by Creator</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer-placed vs staff-placed sales over the selected period
        </p>
      </div>
      <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap="20%"
            barGap={6}
            margin={{ top: 8, right: 4, left: 0, bottom: 24 }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
            <XAxis
              dataKey="label"
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
            <Tooltip cursor={{ fill: "transparent" }} content={<CreatorTooltip />} />
            <Bar
              dataKey="customer"
              radius={[2, 2, 0, 0]}
              animationDuration={700}
              onMouseEnter={(_, index) => setHovered(index)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`customer-${index}`}
                  fill="var(--chart-blue)"
                  fillOpacity={hovered === null || hovered === index ? 1 : 0.45}
                />
              ))}
            </Bar>
            <Bar
              dataKey="staff"
              radius={[2, 2, 0, 0]}
              animationDuration={700}
              onMouseEnter={(_, index) => setHovered(index)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`staff-${index}`}
                  fill="var(--primary)"
                  fillOpacity={hovered === null || hovered === index ? 1 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="size-3 rounded-sm bg-chart-blue" />
        <span className="font-data text-sm text-data-ink">Customer-placed</span>
        <span className="ml-3 size-3 rounded-sm bg-primary" />
        <span className="font-data text-sm text-data-ink">Staff-placed</span>
      </div>
    </div>
  );
};
