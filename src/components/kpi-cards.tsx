import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiCardData = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  badge?: { label: string; icon: LucideIcon };
};

export const KpiCards = ({ items }: { items: KpiCardData[] }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(({ label, value, icon: Icon, trend, badge }) => {
      const isNegative = trend?.startsWith("-");
      const BadgeIcon = badge?.icon;

      return (
        <article key={label} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
          <Icon className="size-5 stroke-2 text-ink" />
          <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4 font-black">
            <p className="text-3xl text-ink">{value}</p>
            {trend ? (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isNegative ? "text-amber-600" : "text-green-600",
                )}
              >
                {isNegative ? (
                  <TrendingDown className="size-3.5 stroke-3" />
                ) : (
                  <TrendingUp className="size-3.5 stroke-3" />
                )}
                {trend}
              </p>
            ) : badge && BadgeIcon ? (
              <p className="inline-flex items-center gap-1 text-xs text-green-600">
                <BadgeIcon className="size-3.5 stroke-3" /> {badge.label}
              </p>
            ) : null}
          </div>
        </article>
      );
    })}
  </div>
);
