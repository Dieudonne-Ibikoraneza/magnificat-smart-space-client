import { products } from "@/data/catalog";

const displayNames = ["Calacatta Gold", "Nero Marquina", "Carrara White", "Carrara White", "Nero Marquina", "Nero Marquina"];
/** On-hand stock, in sqm — sqm is the unit the business tracks stock in; boxes/pieces are derived conversions only. */
const quantitiesSqm = [1240, 45, 0, 0, 45, 45];

export const inventoryProducts = products.slice(0, 10).map((product, index) => ({
  ...product,
  displayName: displayNames[index % displayNames.length],
  /** On-hand stock in sqm. */
  quantity: quantitiesSqm[index % quantitiesSqm.length],
  views: "12.4K",
  rate: "18%",
}));

export type InventoryProduct = (typeof inventoryProducts)[number];
