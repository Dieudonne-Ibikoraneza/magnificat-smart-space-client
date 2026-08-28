import type { Product } from "@/components/product-card";

/**
 * Mocked on-hand stock, derived from a product's `stockStatus` badge since the
 * catalog/inventory mocks don't carry a real per-product quantity everywhere.
 * `low_stock` items are capped to a small on-hand amount so ordinary bulk B2B
 * quantities realistically exceed it; `out_of_stock` has none; `in_stock` is ample.
 */
export const LOW_STOCK_CAP_SQM = 28;

export const getAvailableStockSqm = (product: Pick<Product, "stockStatus">) => {
  if (product.stockStatus === "out_of_stock") return 0;
  if (product.stockStatus === "low_stock") return LOW_STOCK_CAP_SQM;
  return Infinity;
};

export type StockShortage = {
  productId: string;
  productName: string;
  requestedSqm: number;
  /**
   * Exact on-hand amount. Staff-facing order screens may show this; customer
   * surfaces (the cart, and `StockNegotiationChat` there) should show `status`
   * instead — the precise count is not the customer's information to see.
   */
  availableSqm: number;
  status: Product["stockStatus"];
};

export const getStockShortage = (
  product: Pick<Product, "id" | "name" | "stockStatus">,
  requestedSqm: number,
): StockShortage | null => {
  const availableSqm = getAvailableStockSqm(product);
  if (!Number.isFinite(requestedSqm) || requestedSqm <= availableSqm) return null;
  return {
    productId: product.id,
    productName: product.name,
    requestedSqm,
    availableSqm,
    status: product.stockStatus,
  };
};
