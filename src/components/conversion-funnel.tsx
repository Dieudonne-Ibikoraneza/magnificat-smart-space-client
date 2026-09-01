import {
  BadgeCheck,
  BarChart3,
  Handshake,
  LogIn,
  Package,
  Repeat2,
  Ruler,
  ShoppingCart,
  Sparkles,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JourneyStage } from "@/lib/api/types";

/** The backend's 10 `JourneyStage` values, in funnel order, with their display label/icon. */
const STAGE_META: Record<JourneyStage, { title: string; icon: LucideIcon }> = {
  OPENED_SYSTEM: { title: "System Open", icon: LogIn },
  CREATED_ROOM: { title: "3D Room Created", icon: Sparkles },
  ENTERED_DIMENSIONS: { title: "Dimensions Entered", icon: Ruler },
  VIEWED_TILE: { title: "Tile Viewed", icon: Eye },
  APPLIED_TILE: { title: "Tile Applied", icon: BarChart3 },
  SAVED_DESIGN: { title: "Design Saved", icon: Package },
  REQUESTED_QUOTATION: { title: "Quotation Requested", icon: BadgeCheck },
  NEGOTIATED: { title: "Negotiated", icon: Handshake },
  PLACED_ORDER: { title: "Order Placed", icon: ShoppingCart },
  PURCHASED: { title: "Purchased", icon: Repeat2 },
};

export type ConversionFunnelStage = {
  stage: JourneyStage;
  customers: number;
  /** Omit on the first stage — there's nothing to convert from. */
  conversionFromPrevious?: number;
};

const mockFunnel: ConversionFunnelStage[] = [
  { stage: "OPENED_SYSTEM", customers: 5240 },
  { stage: "CREATED_ROOM", customers: 4892, conversionFromPrevious: 93 },
  { stage: "ENTERED_DIMENSIONS", customers: 4520, conversionFromPrevious: 92 },
  { stage: "VIEWED_TILE", customers: 3812, conversionFromPrevious: 84 },
  { stage: "APPLIED_TILE", customers: 2450, conversionFromPrevious: 64 },
  { stage: "SAVED_DESIGN", customers: 1945, conversionFromPrevious: 79 },
  { stage: "REQUESTED_QUOTATION", customers: 1420, conversionFromPrevious: 73 },
  { stage: "NEGOTIATED", customers: 1105, conversionFromPrevious: 77 },
  { stage: "PLACED_ORDER", customers: 842, conversionFromPrevious: 76 },
];

/**
 * Renders the given stages (from `GET /analytics/journey`) in funnel order.
 * Falls back to placeholder data when no `stages` prop is passed, so
 * screens not yet wired to the real endpoint still render something.
 */
export const ConversionFunnel = ({ stages = mockFunnel }: { stages?: ConversionFunnelStage[] }) => {
  const maxCustomers = Math.max(1, ...stages.map((row) => row.customers));

  const funnel = stages.map(({ stage, customers, conversionFromPrevious }, index) => {
    const meta = STAGE_META[stage];
    return [
      meta.title,
      "",
      customers.toLocaleString(),
      index === 0 || conversionFromPrevious === undefined
        ? ""
        : `${conversionFromPrevious.toFixed(0)}% conversion`,
      meta.icon,
      // Bar width reads as an actual funnel — each stage's share of the
      // widest (first) stage — floored so even a near-zero stage stays
      // legible instead of collapsing to a sliver.
      Math.max((customers / maxCustomers) * 100, 8),
    ] as const;
  });

  return (
  <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
    <h2 className="text-2xl font-extrabold text-ink">Conversion Funnel</h2>
    <p className="mt-1 text-sm text-muted">User progression through the digital catalog</p>

    {/* Below sm: straight connector line with uniform-width rows. */}
    <div className="relative mt-7 space-y-3 pl-13 sm:hidden">
      <div className="absolute top-3 bottom-3 left-4.5 w-px bg-border" aria-hidden="true" />
      {funnel.map(([title, subtitle, count, conversion, Icon], index) => {
        const isFirst = index === 0;
        const isLast = index === funnel.length - 1;
        const interactive = !isFirst && !isLast;

        return (
          <div
            key={title}
            className={cn(
              "group relative transition-all duration-300 ease-in-out will-change-transform",
              interactive ? "cursor-pointer" : isFirst ? "cursor-not-allowed" : "cursor-default",
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 -left-13 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300",
                isLast
                  ? "bg-ink text-primary"
                  : isFirst
                    ? "bg-muted-background text-muted"
                    : "bg-muted-background text-muted group-hover:bg-primary group-hover:text-ink group-hover:shadow-[0_4px_12px_rgba(196,241,0,0.35)]",
              )}
            >
              <Icon className="size-4" />
            </div>
            <div
              className={cn(
                "flex min-h-12 min-w-0 w-full items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out",
                isLast
                  ? "border-ink bg-ink text-white"
                  : isFirst
                    ? "border-[#E8E8E8] bg-[#F3F3F3] shadow-none"
                    : "border-[#E8E8E8] bg-[#F3F3F3] shadow-none group-hover:border-primary group-hover:bg-primary/10 group-hover:shadow-[0_6px_18px_rgba(15,39,71,0.08)]",
              )}
            >
              <div>
                <p className={cn("text-xs font-extrabold tracking-widest uppercase", isLast ? "text-primary" : "text-ink")}>
                  {title}
                </p>
                {subtitle && (
                  <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-muted uppercase">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold leading-none">{count}</p>
                {conversion && (
                  <p className={cn("mt-1 text-[10px] font-extrabold tracking-widest uppercase", isLast ? "text-white/70" : "text-muted")}>
                    {conversion}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* sm and up: bar width reflects each stage's real share of the top of the funnel. */}
    <div className="mt-7 hidden space-y-3 sm:block">
      {funnel.map(([title, subtitle, count, conversion, Icon, widthPercent], index) => (
        <div
          key={title}
          className={cn(
            "group relative flex items-center gap-3 transition-all duration-300 ease-in-out will-change-transform",
            index > 0 && index < funnel.length - 1
              ? "cursor-pointer hover:-translate-y-1 hover:scale-[1.01]"
              : index === 0
                ? "cursor-not-allowed"
                : "cursor-default",
          )}
        >
          <div
            className={cn(
              "z-10 flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              index === funnel.length - 1
                ? "bg-ink text-primary"
                : index === 0
                  ? "bg-muted-background text-muted"
                  : "bg-muted-background text-muted group-hover:bg-primary group-hover:text-ink group-hover:shadow-[0_4px_12px_rgba(196,241,0,0.35)]",
            )}
          >
            <Icon className="size-4" />
          </div>
          <div
            style={{ width: `${widthPercent}%` }}
            className={cn(
              "flex min-h-12 min-w-0 items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out",
              index === funnel.length - 1
                ? "border-ink bg-ink text-white"
                : index === 0
                  ? "border-[#E8E8E8] bg-[#F3F3F3] shadow-none"
                  : "border-[#E8E8E8] bg-[#F3F3F3] shadow-none group-hover:border-primary group-hover:bg-primary/10 group-hover:shadow-[0_6px_18px_rgba(15,39,71,0.08)]",
            )}
          >
            <div>
              <p className={cn("text-xs font-extrabold tracking-widest uppercase", index === funnel.length - 1 ? "text-primary" : "text-ink")}>
                {title}
              </p>
              {subtitle && (
                <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-muted uppercase">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold leading-none">{count}</p>
              {conversion && (
                <p className={cn("mt-1 text-[10px] font-extrabold tracking-widest uppercase", index === funnel.length - 1 ? "text-white/70" : "text-muted")}>
                  {conversion}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
  );
};
