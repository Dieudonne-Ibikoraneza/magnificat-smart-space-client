"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { calculateTileQuantity } from "@/lib/tile-calculator";
import type { Product } from "@/components/product-card";

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * `value`/`onChange` are optional — pass them to let a parent read (and
 * seed) the area, e.g. so an "Add to cart" button elsewhere on the page adds
 * exactly what's previewed here. Omit them and the calculator manages its
 * own state, as the staff-facing pages using it still do.
 */
export const QuantityCalculator = ({
  product,
  value,
  onChange,
}: {
  product: Product;
  value?: string;
  onChange?: (value: string) => void;
}) => {
  const { t } = useTranslation();
  const [internalArea, setInternalArea] = useState("26");
  const requiredArea = value ?? internalArea;
  const setRequiredArea = onChange ?? setInternalArea;
  const calculation = useMemo(
    () => calculateTileQuantity(Number(requiredArea), product),
    [product, requiredArea],
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="size-5 text-ink" />
        <h2 className="text-lg font-bold text-ink">{t("quantityCalculator.title")}</h2>
      </div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        {t("quantityCalculator.requiredArea")}
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
        {t("quantityCalculator.spec", {
          size: product.size,
          tileArea: formatNumber(product.tileArea),
          boxCoverage: formatNumber(product.boxCoverage),
          pcs: product.piecesPerBox,
        })}
      </p>
      <dl className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><dt className="text-base font-bold text-ink">{t("quantityCalculator.totalQuantity")}</dt><dd className="text-xl font-bold text-ink">{t("quantityCalculator.totalQuantityValue", { area: formatNumber(calculation.purchasedArea) })}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("quantityCalculator.completeBoxes")}</dt><dd className="font-bold text-ink">{calculation.completeBoxes}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("quantityCalculator.remainingArea")}</dt><dd className="font-bold text-ink">{formatNumber(calculation.remainingArea)} m²</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("quantityCalculator.additionalPieces")}</dt><dd className="font-bold text-ink">{calculation.remainingPieces}</dd></div>
        <div className="flex justify-between text-xs text-muted"><dt>{t("quantityCalculator.equivalent")}</dt><dd>{t("quantityCalculator.equivalentValue", { boxes: calculation.completeBoxes, pieces: calculation.remainingPieces, total: calculation.totalPieces })}</dd></div>
      </dl>
    </section>
  );
};
