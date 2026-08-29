import type { Product } from "@/components/product-card";
import type { Collection } from "@/data/collections";
import type { ApiCollection, ApiProduct, RoomType, SuitableFor } from "./types";

/**
 * Translation layer between the API's shapes and the ones the UI already
 * renders. The server speaks Prisma enums and `Decimal`-as-string; the
 * components speak display labels and numbers. Keeping the conversion in one
 * place means a page can switch from mock data to the API by swapping its data
 * source, without touching a single component.
 */

/** Display labels the catalog filters and product cards use, keyed by API enum. */
export const roomTypeLabels: Record<RoomType, string> = {
  LIVING_ROOM: "Living Room (Saloon)",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
  KITCHEN: "Kitchen",
  BALCONY: "Balcony",
  STAIRS: "Stairs",
  GATES: "Gates",
  OUTDOOR: "Outdoor",
};

const roomTypeByLabel = new Map<string, RoomType>(
  (Object.entries(roomTypeLabels) as [RoomType, string][]).map(([value, label]) => [label, value]),
);

export const toRoomType = (label: string): RoomType | undefined => roomTypeByLabel.get(label);

export const suitableForLabels: Record<SuitableFor, Product["suitableFor"]> = {
  FLOOR: "floor",
  WALL: "wall",
  BOTH: "both",
};

const suitableForByLabel: Record<Product["suitableFor"], SuitableFor> = {
  floor: "FLOOR",
  wall: "WALL",
  both: "BOTH",
};

export const toSuitableFor = (value: Product["suitableFor"]): SuitableFor =>
  suitableForByLabel[value];

/** Prisma returns Decimal columns as strings; every price and area needs this. */
const toNumber = (value: string | number): number => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Maps an API product onto the `Product` shape the cards, catalog and
 * calculator already consume. `collectionTitle` is optional because the
 * products endpoint returns the collection's `size` but not its title — pass it
 * in when the collection has already been fetched, otherwise the size stands in.
 */
export const toProduct = (product: ApiProduct, collectionTitle?: string): Product => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  collectionId: product.collectionId,
  collection: collectionTitle ?? product.size,
  size: product.size,
  tileArea: product.tileAreaSqm,
  boxCoverage: toNumber(product.boxCoverageSqm),
  piecesPerBox: product.piecesPerBox,
  price: toNumber(product.price),
  image: product.image,
  description: product.description ?? "",
  stockStatus: product.stockStatus,
  roomTypes: product.roomTypes.map((roomType) => roomTypeLabels[roomType]),
  suitableFor: suitableForLabels[product.suitableFor],
});

export const toCollection = (collection: ApiCollection): Collection => ({
  id: collection.id,
  title: collection.title,
  description: collection.description ?? "",
  image: collection.image ?? "",
  size: collection.size,
});

/**
 * Exact on-hand stock (in m² — the unit stock is held and moved in; boxes/
 * pieces are only ever a display conversion) is only returned to staff (doc
 * 3.2), so this is `undefined` for a client or anonymous viewer — render the
 * status badge instead of a figure when it is.
 */
export const availableStockSqm = (product: ApiProduct): number | undefined =>
  product.quantityOnHandSqm === undefined ? undefined : Math.max(0, product.quantityOnHandSqm);
