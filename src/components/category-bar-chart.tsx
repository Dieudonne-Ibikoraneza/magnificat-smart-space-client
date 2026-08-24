"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartAxisTick } from "@/components/chart-axis-tick";
import { cn } from "@/lib/utils";

export type CategoryDatum = { category: string; value: number };

type CategoryTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  tooltipLabel: string;
  tooltipValueFormatter: (value: number) => string;
  uppercaseTooltipLabel?: boolean;
};

const CategoryTooltip = ({
  active,
  payload,
  label,
  tooltipLabel,
  tooltipValueFormatter,
  uppercaseTooltipLabel,
}: CategoryTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <p
        className={cn(
          "font-data text-xs font-semibold tracking-widest text-data-ink",
          uppercaseTooltipLabel && "uppercase",
        )}
      >
        {label}
      </p>
      <p className="mt-1 font-data text-sm text-ink">
        {tooltipLabel}: {tooltipValueFormatter(payload[0].value)}
      </p>
    </div>
  );
};

type CategoryBarChartProps = {
  title: string;
  subtitle: string;
  data: CategoryDatum[];
  tooltipLabel: string;
  tooltipValueFormatter: (value: number) => string;
  yTicks: number[];
  yDomainMax: number;
  yTickFormatter: (value: number) => string;
  uppercaseTooltipLabel?: boolean;
};

export const CategoryBarChart = ({
  title,
  subtitle,
  data,
  tooltipLabel,
  tooltipValueFormatter,
  yTicks,
  yDomainMax,
  yTickFormatter,
  uppercaseTooltipLabel,
}: CategoryBarChartProps) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <h2 className="text-lg font-bold text-ink">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-6 h-65 w-full font-data sm:mt-8 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis
            dataKey="category"
            tickLine={false}
            axisLine={false}
            tick={ChartAxisTick}
            tickFormatter={(value: string) => value.toUpperCase()}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            ticks={yTicks}
            domain={[0, yDomainMax]}
            tickFormatter={yTickFormatter}
            tick={ChartAxisTick}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            content={
              <CategoryTooltip
                tooltipLabel={tooltipLabel}
                tooltipValueFormatter={tooltipValueFormatter}
                uppercaseTooltipLabel={uppercaseTooltipLabel}
              />
            }
          />
          <Bar dataKey="value" fill="var(--chart-blue)" barSize="70%" radius={[2, 2, 0, 0]} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);
