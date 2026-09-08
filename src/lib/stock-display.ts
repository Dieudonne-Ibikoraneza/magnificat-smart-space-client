import type { StockStatus } from "@/lib/api/types";

/**
 * Staff-only nuance on top of the server's `stockStatus`: that field is
 * available-area-based (on hand minus what other customers' PENDING orders
 * are holding) — correct for what a customer can buy right now, but shown
 * bare to staff it reads as "we're out of this tile" even when the shelves
 * are physically full and it's simply held by a pending order's payment
 * window. `"reserved"` distinguishes that case so staff aren't left
 * guessing why a fully-stocked product shows red.
 */
export type StaffStockStatus = StockStatus | "reserved";

export type StaffStockDisplay = {
  status: StaffStockStatus;
  label: string;
  dot: string;
  text: string;
  badge: string;
  quantity: string;
  quantityOnHandSqm: number;
  reservedAreaSqm: number;
  availableAreaSqm: number;
};

const STATUS_META: Record<
  StaffStockStatus,
  { label: string; dot: string; text: string; badge: string; quantity: string }
> = {
  in_stock: {
    label: "In stock",
    dot: "bg-green-500",
    text: "text-green-700",
    badge: "border-green-200 bg-green-50 text-green-700",
    quantity: "text-ink",
  },
  low_stock: {
    label: "Low stock",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "border-amber/30 bg-white/95 text-amber",
    quantity: "text-amber-600",
  },
  reserved: {
    label: "Fully reserved",
    dot: "bg-blue-500",
    text: "text-blue-700",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    quantity: "text-blue-600",
  },
  out_of_stock: {
    label: "Out of stock",
    dot: "bg-red-500",
    text: "text-red-600",
    badge: "border-red-200 bg-red-50 text-red-700",
    quantity: "text-red-600",
  },
};

/**
 * A product only ever reads as genuinely `out_of_stock` to staff when
 * there's nothing physically on the shelf — if it's on hand but every
 * square metre is tied up in a pending order, that's `"reserved"` instead,
 * a demand/timing situation, not an inventory shortage.
 */
export const staffStockDisplay = (product: {
  stockStatus: StockStatus;
  quantityOnHandSqm?: number;
  reservedAreaSqm?: number;
}): StaffStockDisplay => {
  const quantityOnHandSqm = product.quantityOnHandSqm ?? 0;
  const reservedAreaSqm = product.reservedAreaSqm ?? 0;
  const availableAreaSqm = Math.max(0, quantityOnHandSqm - reservedAreaSqm);
  const status: StaffStockStatus =
    product.stockStatus === "out_of_stock" && quantityOnHandSqm > 0 && reservedAreaSqm > 0
      ? "reserved"
      : product.stockStatus;

  return { ...STATUS_META[status], status, quantityOnHandSqm, reservedAreaSqm, availableAreaSqm };
};
