"use client";

import { useState } from "react";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";

/** Current stock level (in sqm) plus the action to adjust it — kept together so the figure updates live. */
export const StockLevelPanel = ({
  productName,
  initialStockSqm,
}: {
  productName: string;
  initialStockSqm: number;
}) => {
  const [stock, setStock] = useState(initialStockSqm);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Current Stock Level</span>
          <span className="font-data text-xl font-bold text-ink">
            {stock.toLocaleString()} <span className="text-sm font-normal">sqm</span>
          </span>
        </div>
      </div>
      <AdjustStockDialog productName={productName} currentStockSqm={stock} onAdjust={setStock} />
    </div>
  );
};
