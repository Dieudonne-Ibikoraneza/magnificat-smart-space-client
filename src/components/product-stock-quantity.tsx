"use client";

import { useTranslation } from "react-i18next";
import { cn, isFiniteNumber } from "@/lib/utils";

/** Read-only physical stock. An omitted API field is not a zero balance. */
export function ProductStockQuantity({
  quantity,
  className,
}: {
  quantity?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!isFiniteNumber(quantity)) return null;
  return (
    <p className={cn("text-xs font-semibold text-ink", className)}>
      {t("staffToolbar.product.onHand")}:{" "}
      {quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} m²
    </p>
  );
}
