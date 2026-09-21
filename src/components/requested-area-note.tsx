"use client";

import { useTranslation } from "react-i18next";
import type { ApiOrderItem } from "@/lib/api/types";
import { billedAreaOf, requestedAreaOf } from "@/lib/order-area";

/**
 * Tiles are sold in whole pieces, so a line's billed area can be a little more than what was
 * asked for. Shown only when they differ, so the quantity never looks unrelated to the price.
 */
export function RequestedAreaNote({ item }: { item: ApiOrderItem }) {
  const { t } = useTranslation();
  if (billedAreaOf(item) === requestedAreaOf(item)) return null;
  return (
    <span className="mt-1 block text-xs text-muted-foreground">
      {t("common.orderArea.requested", { value: requestedAreaOf(item).toLocaleString() })}
    </span>
  );
}
