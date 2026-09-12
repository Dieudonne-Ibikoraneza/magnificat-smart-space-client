"use client";

import Link from "next/link";
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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { JourneyStage } from "@/lib/api/types";

/** Stage title translation keys — display only; `JOURNEY_STAGE_META.title` keeps the canonical English for non-localized surfaces. */
export const JOURNEY_STAGE_TITLE_KEYS: Record<JourneyStage, string> = {
  OPENED_SYSTEM: "staff.journeyStage.OPENED_SYSTEM",
  CREATED_ROOM: "staff.journeyStage.CREATED_ROOM",
  ENTERED_DIMENSIONS: "staff.journeyStage.ENTERED_DIMENSIONS",
  VIEWED_TILE: "staff.journeyStage.VIEWED_TILE",
  APPLIED_TILE: "staff.journeyStage.APPLIED_TILE",
  SAVED_DESIGN: "staff.journeyStage.SAVED_DESIGN",
  REQUESTED_QUOTATION: "staff.journeyStage.REQUESTED_QUOTATION",
  NEGOTIATED: "staff.journeyStage.NEGOTIATED",
  PLACED_ORDER: "staff.journeyStage.PLACED_ORDER",
  PURCHASED: "staff.journeyStage.PURCHASED",
};

/** The backend's 10 `JourneyStage` values, in funnel order, with their display label/icon — shared with Journey Analytics so stage names read the same everywhere. */
export const JOURNEY_STAGE_META: Record<JourneyStage, { title: string; icon: LucideIcon }> = {
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
 * Renders the given stages (from `GET /analytics/journey`) in funnel order,
 * as an icon-circle + proportional-width bar row — the funnel style used
 * everywhere except Customer Analytics (see `CustomerConversionFunnel` for
 * that page's simpler label + bar list, which matches its own design).
 * Falls back to placeholder data when no `stages` prop is passed, so
 * screens not yet wired to the real endpoint still render something.
 */
export const ConversionFunnel = ({
  stages = mockFunnel,
  getHref,
}: {
  stages?: ConversionFunnelStage[];
  /**
   * Builds the URL a stage's row links to (its own Journey Analytics page,
   * pre-selected on that stage via `?stage=`) — omit it on a page with no
   * such page to send the visitor to (e.g. stock's reports page, which has
   * no Journey Analytics of its own), and the row renders inert instead of
   * showing a hover affordance that goes nowhere.
   */
  getHref?: (stage: JourneyStage) => string;
}) => {
  const { t } = useTranslation();
  const maxCustomers = Math.max(1, ...stages.map((row) => row.customers));

  const funnel = stages.map(({ stage, customers, conversionFromPrevious }, index) => {
    const meta = JOURNEY_STAGE_META[stage];
    return [
      stage,
      t(JOURNEY_STAGE_TITLE_KEYS[stage]),
      "",
      customers.toLocaleString(),
      index === 0 || conversionFromPrevious === undefined
        ? ""
        : t("staff.conversionFunnel.conversion", { value: conversionFromPrevious.toFixed(0) }),
      meta.icon,
      // Bar width reads as an actual funnel — each stage's share of the
      // widest (first) stage — floored so even a near-zero stage stays
      // legible instead of collapsing to a sliver.
      Math.max((customers / maxCustomers) * 100, 8),
    ] as const;
  });

  return (
  <section className="rounded-[14px] bg-white p-6 shadow-sm sm:p-8">
    <h2 className="text-2xl font-extrabold text-ink">{t("staff.conversionFunnel.title")}</h2>
    <p className="mt-1 text-sm text-muted">{t("staff.conversionFunnel.subtitle")}</p>

    {/* Below sm: straight connector line with uniform-width rows. */}
    <div className="relative mt-7 space-y-3 pl-13 sm:hidden">
      <div className="absolute top-3 bottom-3 left-4.5 w-px bg-border" aria-hidden="true" />
      {funnel.map(([stage, title, subtitle, count, conversion, Icon], index) => {
        const isFirst = index === 0;
        const isLast = index === funnel.length - 1;
        const interactive = !isFirst && !isLast && !!getHref;

        const row = (
          <div
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

        return interactive ? (
          <Link key={stage} href={getHref!(stage)} className="block">
            {row}
          </Link>
        ) : (
          <div key={stage}>{row}</div>
        );
      })}
    </div>

    {/* sm and up: bar width reflects each stage's real share of the top of the funnel. */}
    <div className="mt-7 hidden space-y-3 sm:block">
      {funnel.map(([stage, title, subtitle, count, conversion, Icon, widthPercent], index) => {
        const isFirst = index === 0;
        const isLast = index === funnel.length - 1;
        const interactive = !isFirst && !isLast && !!getHref;

        const row = (
          <div
            className={cn(
              "group relative flex items-center gap-3 transition-all duration-300 ease-in-out will-change-transform",
              interactive ? "cursor-pointer" : isFirst ? "cursor-not-allowed" : "cursor-default",
            )}
          >
            <div
              className={cn(
                "z-10 flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                isLast
                  ? "bg-ink text-primary"
                  : isFirst
                    ? "bg-muted-background text-muted"
                    : "bg-muted-background text-muted group-hover:bg-primary group-hover:text-ink group-hover:shadow-[0_4px_12px_rgba(196,241,0,0.35)]",
              )}
            >
              <Icon className="size-4" />
            </div>
            {/* Anchored to the row's right edge (`justify-end`) so a
                narrower stage's empty space falls between the icon and the
                bar's left edge, not trailing off after the bar's right edge
                — reads as an actual taper instead of an arbitrary gap that
                moves around depending on which stage happens to be widest. */}
            <div className="flex min-w-0 flex-1 justify-end">
            <div
              style={{ width: `${widthPercent}%` }}
              className={cn(
                "flex min-h-12 min-w-0 items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out",
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
          </div>
        );

        return interactive ? (
          <Link key={stage} href={getHref!(stage)} className="block">
            {row}
          </Link>
        ) : (
          <div key={stage}>{row}</div>
        );
      })}
    </div>
  </section>
  );
};

/**
 * Customer Analytics' own funnel style — label + proportional-width bar +
 * value/conversion-% row, matching that page's design exactly. Every other
 * page uses the icon-circle `ConversionFunnel` above instead.
 */
export const CustomerConversionFunnel = ({ stages = mockFunnel }: { stages?: ConversionFunnelStage[] }) => {
  const { t } = useTranslation();
  const maxCustomers = Math.max(1, ...stages.map((row) => row.customers));

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{t("staff.conversionFunnel.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("staff.conversionFunnel.subtitle")}</p>
      <div className="mt-7 space-y-4">
        {stages.map(({ stage, customers, conversionFromPrevious }, index) => {
          // Floored so even a near-zero stage stays visible instead of collapsing to nothing.
          const widthPercent = Math.max((customers / maxCustomers) * 100, 4);
          return (
            <div key={stage} className="flex items-center justify-between gap-3 font-data text-sm">
              <p className="w-32 shrink-0 text-right font-data font-medium text-ink sm:w-40">{t(JOURNEY_STAGE_TITLE_KEYS[stage])}</p>
              <div className="min-w-8 flex-1">
                <div className="h-6 bg-chart-blue transition-all duration-500" style={{ width: `${widthPercent}%` }} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-right text-lg font-extrabold text-ink">{customers.toLocaleString()}</p>
                {index > 0 && conversionFromPrevious !== undefined && (
                  <p className="text-right text-xs font-black text-green-600">{conversionFromPrevious.toFixed(0)}%</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
