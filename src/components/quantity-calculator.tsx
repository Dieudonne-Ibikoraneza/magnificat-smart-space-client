"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { calculateTileQuantity } from "@/lib/tile-calculator";
import type { Product } from "@/components/product-card";

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const QuantityCalculator = ({ product }: { product: Product }) => {
  const [requiredArea, setRequiredArea] = useState("26");
  const calculation = useMemo(
    () => calculateTileQuantity(Number(requiredArea), product),
    [product, requiredArea],
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="size-5 text-ink" />
        <h2 className="text-lg font-bold text-ink">Quantity Calculator</h2>
      </div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        Required area (m²)
        <Input
          type="number"
          min="0"
          step="0.01"
          value={requiredArea}
          onChange={(event) => setRequiredArea(event.target.value)}
          inputMode="decimal"
          className="mt-2 h-12 text-base font-semibold"
        />
      </label>
      <p className="mt-3 text-xs text-muted">
        {product.size}: {formatNumber(product.tileArea)} m² per piece · {formatNumber(product.boxCoverage)} m² per box · {product.piecesPerBox} pcs per box
      </p>
      <dl className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Complete boxes</dt><dd className="font-bold text-ink">{calculation.completeBoxes}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Remaining area</dt><dd className="font-bold text-ink">{formatNumber(calculation.remainingArea)} m²</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Additional pieces</dt><dd className="font-bold text-ink">{calculation.remainingPieces}</dd></div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4"><dt className="text-base font-bold text-ink">Total quantity</dt><dd className="text-xl font-bold text-ink">{calculation.completeBoxes} boxes + {calculation.remainingPieces} pcs</dd></div>
        <div className="flex justify-between text-xs text-muted"><dt>Equivalent total</dt><dd>{calculation.totalPieces} pieces · {formatNumber(calculation.purchasedArea)} m²</dd></div>
      </dl>
    </section>
  );
};
