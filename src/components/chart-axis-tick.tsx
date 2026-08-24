type ChartAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  textAnchor?: "start" | "middle" | "end";
  angle?: number;
  tickFormatter?: (value: string | number, index: number) => string;
  index?: number;
};

/**
 * Recharts renders axis labels as raw SVG <text>, which only takes the
 * Manrope font via an inline `fontFamily` presentation attribute — the
 * lowest-priority thing in the CSS cascade, easily lost to any inherited
 * font-family rule. Rendering the tick ourselves with a real Tailwind
 * class sidesteps that entirely.
 */
export const ChartAxisTick = ({
  x = 0,
  y = 0,
  payload,
  textAnchor = "middle",
  angle,
  tickFormatter,
  index = 0,
}: ChartAxisTickProps) => {
  if (!payload) return <text />;

  const value = tickFormatter ? tickFormatter(payload.value, index) : payload.value;

  return (
    <text
      x={x}
      y={y}
      dy={angle ? 4 : 12}
      textAnchor={textAnchor}
      transform={angle ? `rotate(${angle} ${x} ${y})` : undefined}
      className="font-data fill-data-ink text-[11px] recharts-cartesian-axis-tick-value"
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      {value}
    </text>
  );
};
