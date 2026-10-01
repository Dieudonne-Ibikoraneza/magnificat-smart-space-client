"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { formatCompactNumber } from "@/lib/utils";

const RevenueTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p>
      <p className="mt-1 font-data text-sm text-ink">
        {t("analytics.revenueChart.revenue", { value: payload[0].value.toLocaleString() })}
      </p>
    </div>
  );
};

export const RevenueTrendChart = ({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  /** Trend points fetched for the page's global period selection. */
  data: { day: string; value: number }[];
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
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
              tickFormatter={(value: number) => (value === 0 ? "0" : formatCompactNumber(value))}
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
