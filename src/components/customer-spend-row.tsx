import { formatCompactCurrency, isFiniteNumber } from "@/lib/utils";

/** The API may withhold spending for the viewer; never present that as zero. */
export function CustomerSpendRow({ spend, label }: { spend?: number; label: string }) {
  if (!isFiniteNumber(spend)) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold whitespace-nowrap text-ink">
        {formatCompactCurrency(spend)}
      </dd>
    </div>
  );
}
