import {
  BarChart3,
  Calculator,
  Eye,
  LogIn,
  Repeat2,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export const ConversionFunnel = () => (
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

    {/* sm and up: staggered staircase rows. */}
    <div className="mt-7 hidden space-y-3 sm:block">
      {funnel.map(([title, subtitle, count, conversion, Icon], index) => (
        <div
          key={title}
          style={{
            marginLeft: `${index * 12}px`,
            width: `calc(100% - ${index * 12}px)`,
          }}
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
            className={cn(
              "flex min-h-12 min-w-0 w-full flex-1 items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out",
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
