import type { Product } from "@/components/product-card";
import { roomTypeLabels } from "@/lib/api/mappers";

export const PAGE_SIZE = 6;

export type SortOption = "newest" | "low" | "high";

export type CatalogFilters = {
  "Room type": string[];
  Size: string[];
  Availability: string[];
  "Suitable for": string[];
};

export type FilterGroup = { title: keyof CatalogFilters; options: string[] };

const SUITABLE_FOR_OPTIONS = ["Floor", "Wall", "Floor & Wall"];
const AVAILABILITY_OPTIONS = ["In Stock Ready", "Low Stock", "Out of Stock (Pre-order)"];

/**
 * Room type is a closed enum (`roomTypeLabels`), so every value is offered
 * regardless of what's actually in `products` — a customer can always filter
 * by "Bedroom" even if today's page has none. Size isn't an enum — a
 * collection sets it freely — so it's derived from what's actually on the
 * page; this also means a single collection's catalog naturally only offers
 * the one size it has, instead of a list of sizes that don't apply to it.
 */
export const buildFilterGroups = (products: Product[]): FilterGroup[] => [
  { title: "Room type", options: Object.values(roomTypeLabels) },
  { title: "Suitable for", options: SUITABLE_FOR_OPTIONS },
  { title: "Size", options: Array.from(new Set(products.map((product) => product.size))).sort() },
  { title: "Availability", options: AVAILABILITY_OPTIONS },
];

export const EMPTY_FILTERS: CatalogFilters = {
  "Room type": [],
  Size: [],
  Availability: [],
  "Suitable for": [],
};

export const availabilityFilterMap: Record<
  string,
  Product["stockStatus"]
> = {
  "In Stock Ready": "in_stock",
  "Low Stock": "low_stock",
  "Out of Stock (Pre-order)": "out_of_stock",
};

const matchesSuitableForFilter = (
  product: Product,
  selected: string[],
) =>
  selected.some((option) => {
    if (option === "Floor") {
      return product.suitableFor === "floor" || product.suitableFor === "both";
    }
    if (option === "Wall") {
      return product.suitableFor === "wall" || product.suitableFor === "both";
    }
    if (option === "Floor & Wall") {
      return product.suitableFor === "both";
    }
    return false;
  });

export const sortLabels: Record<SortOption, string> = {
  newest: "Newest Arrivals",
  low: "Price: Low to High",
  high: "Price: High to Low",
};

export const toggleFilterOption = (
  filters: CatalogFilters,
  group: keyof CatalogFilters,
  option: string,
): CatalogFilters => {
  const selected = filters[group];
  const next = selected.includes(option)
    ? selected.filter((value) => value !== option)
    : [...selected, option];

  return { ...filters, [group]: next };
};

export const hasActiveFilters = (filters: CatalogFilters) =>
  Object.values(filters).some((group) => group.length > 0);

export const filterProducts = (
  products: Product[],
  filters: CatalogFilters,
): Product[] =>
  products.filter((product) => {
    if (
      filters["Room type"].length > 0 &&
      !filters["Room type"].some((room) => product.roomTypes.includes(room))
    ) {
      return false;
    }

    if (
      filters.Size.length > 0 &&
      !filters.Size.includes(product.size)
    ) {
      return false;
    }

    if (filters.Availability.length > 0) {
      const allowed = filters.Availability.map(
        (label) => availabilityFilterMap[label],
      );
      if (!allowed.includes(product.stockStatus)) {
        return false;
      }
    }

    if (
      filters["Suitable for"].length > 0 &&
      !matchesSuitableForFilter(product, filters["Suitable for"])
    ) {
      return false;
    }

    return true;
  });

export const sortProducts = (
  products: Product[],
  sortBy: SortOption,
): Product[] => {
  const sorted = [...products];

  switch (sortBy) {
    case "low":
      return sorted.sort((a, b) => a.price - b.price);
    case "high":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    default: {
      // Mock catalog ids are sequential numbers, so a higher id is newer.
      // Real product ids are UUIDs with no such ordering — for those, trust
      // the order the products arrived in (the API already returns newest
      // first by default) instead of sorting.
      const allNumericIds = products.every((product) => /^\d+$/.test(product.id));
      return allNumericIds ? sorted.sort((a, b) => Number(b.id) - Number(a.id)) : sorted;
    }
  }
};

export const paginateProducts = (
  products: Product[],
  page: number,
  pageSize = PAGE_SIZE,
) => {
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: products.slice(start, start + pageSize),
    totalPages,
    currentPage: safePage,
    showingStart: products.length === 0 ? 0 : start + 1,
    showingEnd: Math.min(start + pageSize, products.length),
    totalResults: products.length,
  };
};

export const getVisiblePages = (
  current: number,
  total: number,
): (number | "ellipsis")[] => {
  if (total <= 0) return [];
  if (total === 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
};
