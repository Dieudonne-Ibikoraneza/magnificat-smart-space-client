import { products } from "@/data/catalog";

const displayNames = ["Calacatta Gold", "Nero Marquina", "Carrara White", "Carrara White", "Nero Marquina", "Nero Marquina"];
const quantities = [1240, 45, 0, 0, 45, 45];

export const inventoryProducts = products.slice(0, 10).map((product, index) => ({
  ...product,
  displayName: displayNames[index % displayNames.length],
  quantity: quantities[index % quantities.length],
  views: "12.4K",
  rate: "18%",
}));

export type InventoryProduct = (typeof inventoryProducts)[number];
