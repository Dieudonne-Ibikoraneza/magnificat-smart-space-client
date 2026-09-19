import type { Product } from "@/components/product-card";
import type { Collection } from "@/lib/domain-types";
import type { Locale } from "@/lib/i18n";
import type { ApiCollection, ApiProduct, HearAboutUs, RoomType, SuitableFor } from "./types";

/**
 * Picks the Kinyarwanda copy over the English original when the current
 * locale is `rw` and a translation actually exists (`rw` is `null` until
 * `TranslationService` fills it in server-side) — otherwise falls back to
 * English. The one place every `*Rw` field (products, collections, rooms)
 * gets read, so a missing translation never shows blank text.
 */
export const localizedText = (en: string, rw: string | null | undefined, locale: Locale): string =>
  locale === "rw" && rw ? rw : en;

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
};

/** Display labels for the "how did you hear about us" enum — used on Customer Analytics' acquisition-channel chart. */
export const hearAboutUsLabels: Record<HearAboutUs, string> = {
  SOCIAL_MEDIA: "Social Media",
  REFERRAL: "Referral",
  ADVERTISEMENT: "Advertisement",
  SEARCH_ENGINE: "Search Engine",
  OTHER: "Other",
};

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
 * in when the collection has already been fetched (already locale-picked by
 * the caller, e.g. via `localizedText`, if it came from a separate request).
 * The nested collection is available on product responses as well; the size
 * fallback is only for older cached responses that predate the nested
 * collection metadata. `locale` defaults to `"en"` so an unmigrated call site
 * degrades to the pre-translation behavior instead of breaking.
 */
export const toProduct = (product: ApiProduct, collectionTitle?: string, locale: Locale = "en"): Product => ({
  id: product.id,
  sku: product.sku,
  name: localizedText(product.name, product.nameRw, locale),
  collectionId: product.collectionId,
  collection:
    collectionTitle ??
    localizedText(product.collection?.title ?? product.size, product.collection?.titleRw, locale),
  size: product.size,
  tileArea: product.tileAreaSqm,
  boxCoverage: toNumber(product.boxCoverageSqm),
  piecesPerBox: product.piecesPerBox,
  price: toNumber(product.price),
  image: product.image,
  description: localizedText(product.description ?? "", product.descriptionRw, locale),
  stockStatus: product.stockStatus,
  roomTypes: product.roomTypes.map((roomType) => roomTypeLabels[roomType]),
  suitableFor: suitableForLabels[product.suitableFor],
});

export const toCollection = (collection: ApiCollection, locale: Locale = "en"): Collection => ({
  id: collection.id,
  title: localizedText(collection.title, collection.titleRw, locale),
  description: localizedText(collection.description ?? "", collection.descriptionRw, locale),
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
