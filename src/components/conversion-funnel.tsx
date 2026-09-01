import type { JourneyStage } from "@/lib/api/types";

/** The backend's 10 `JourneyStage` values, in funnel order, with their display label. */
const STAGE_TITLES: Record<JourneyStage, string> = {
  OPENED_SYSTEM: "System Opened",
  CREATED_ROOM: "3D Room Created",
  ENTERED_DIMENSIONS: "Dimensions Entered",
  VIEWED_TILE: "Tile Viewed",
  APPLIED_TILE: "Tile Applied",
  SAVED_DESIGN: "Design Saved",
  REQUESTED_QUOTATION: "Quotation Requested",
  NEGOTIATED: "Negotiated",
  PLACED_ORDER: "Order Placed",
  PURCHASED: "Purchased",
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
 * as a label + proportional-width bar + value/conversion row — one bar per
 * stage, width scaled to that stage's share of the top of the funnel.
 * Falls back to placeholder data when no `stages` prop is passed, so
 * screens not yet wired to the real endpoint still render something.
 */
export const ConversionFunnel = ({ stages = mockFunnel }: { stages?: ConversionFunnelStage[] }) => {
  const maxCustomers = Math.max(1, ...stages.map((row) => row.customers));

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">Conversion Funnel</h2>
      <p className="mt-1 text-sm text-muted-foreground">User progression through the digital catalog</p>
      <div className="mt-7 space-y-4">
        {stages.map(({ stage, customers, conversionFromPrevious }, index) => {
          // Floored so even a near-zero stage stays visible instead of collapsing to nothing.
          const widthPercent = Math.max((customers / maxCustomers) * 100, 4);
          return (
            <div key={stage} className="flex items-center justify-between gap-3 font-data text-sm">
              <p className="w-32 shrink-0 text-right font-data font-medium text-ink sm:w-40">{STAGE_TITLES[stage]}</p>
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
