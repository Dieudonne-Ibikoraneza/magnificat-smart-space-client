import type { ApiOrderItem } from "@/lib/api/types";

/** Rounded so a 4-decimal database value never shows floating-point noise. */
const round = (value: number) => Math.round(value * 10_000) / 10_000;

/** The area an order line is actually billed for — always what its price and stock are based on. */
export const billedAreaOf = (item: Pick<ApiOrderItem, "purchasedAreaSqm">) =>
  round(Number(item.purchasedAreaSqm));

/** What the customer originally asked for. */
export const requestedAreaOf = (item: Pick<ApiOrderItem, "requiredAreaSqm">) =>
  round(Number(item.requiredAreaSqm));
