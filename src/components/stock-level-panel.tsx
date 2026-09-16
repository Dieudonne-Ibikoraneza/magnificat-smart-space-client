"use client";

import { useTranslation } from "react-i18next";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";

/**
 * Current stock level (in sqm) plus the action to adjust it. When part of
 * the on-hand quantity is held by other customers' still-PENDING orders
 * (`reservedAreaSqm`), that's broken out as its own row instead of staying
 * invisible — otherwise a fully-reserved product just looks unexplainably
 * "out of stock" here while this same panel shows a healthy on-hand number.
 *
 * Deliberately doesn't also spell out "available to sell: 0 sqm" once
 * everything's reserved — that reads as if the stock itself is gone, when
 * it's sitting right above in "Current Stock Level". The reserved figure
 * alone already tells the full story (on hand minus reserved is implied,
 * not restated) without a second number that says the same thing more
 * alarmingly.
 */
export const StockLevelPanel = ({
  productId,
  productName,
  currentStockSqm,
  reservedAreaSqm = 0,
  onAdjusted,
}: {
  productId: string;
  productName: string;
  currentStockSqm: number;
  reservedAreaSqm?: number;
  /** Called after a successful adjustment so the parent can refetch the product. */
  onAdjusted: () => void;
}) => {
  const { t } = useTranslation();

  return (
  <div className="space-y-4">
    <div className="space-y-2 rounded-xl border border-border bg-secondary/50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{t("staff.stockLevelPanel.currentLevel")}</span>
        <span className="font-data text-xl font-bold text-ink">
          {currentStockSqm.toLocaleString()} <span className="text-sm font-normal">{t("staff.stockLevelPanel.sqm")}</span>
        </span>
      </div>
      {reservedAreaSqm > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
          <span className="text-xs font-medium text-blue-700">{t("staff.stockLevelPanel.reserved")}</span>
          <span className="font-data text-sm font-bold text-blue-700">
            −{reservedAreaSqm.toLocaleString()} <span className="text-xs font-normal">{t("staff.stockLevelPanel.sqm")}</span>
          </span>
        </div>
      )}
    </div>
    <AdjustStockDialog
      productId={productId}
      productName={productName}
      currentStockSqm={currentStockSqm}
      onAdjusted={onAdjusted}
    />
  </div>
  );
};
