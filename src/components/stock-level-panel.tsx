"use client";

import { AdjustStockDialog } from "@/components/adjust-stock-dialog";

/** Current stock level (in sqm) plus the action to adjust it. */
export const StockLevelPanel = ({
  productId,
  productName,
  currentStockSqm,
  onAdjusted,
}: {
  productId: string;
  productName: string;
  currentStockSqm: number;
  /** Called after a successful adjustment so the parent can refetch the product. */
  onAdjusted: () => void;
}) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">Current Stock Level</span>
        <span className="font-data text-xl font-bold text-ink">
          {currentStockSqm.toLocaleString()} <span className="text-sm font-normal">sqm</span>
        </span>
      </div>
    </div>
    <AdjustStockDialog
      productId={productId}
      productName={productName}
      currentStockSqm={currentStockSqm}
      onAdjusted={onAdjusted}
    />
  </div>
);
