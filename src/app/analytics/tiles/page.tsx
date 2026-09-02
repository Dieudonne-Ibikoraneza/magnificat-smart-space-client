"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Heart,
  MousePointerClick,
  ChartNoAxesColumn,
  MousePointerSquareDashed,
  Search,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { FilterOptionsCard } from "@/components/product-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  availabilityFilterMap,
  EMPTY_FILTERS,
  getVisiblePages,
  hasActiveFilters,
  toggleFilterOption,
  type CatalogFilters,
  type FilterGroup,
} from "@/lib/catalog-utils";
import { cn, formatCompactNumber } from "@/lib/utils";
import { analyticsApi, productsApi } from "@/lib/api";
import { roomTypeLabels, suitableForLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import type { TileAnalytics, TilePerformanceRow } from "@/lib/api/types";

/** `TilePerformanceRow` plus the catalog attributes only the product record carries — needed for the same Room type / Suitable for filters the storefront catalog uses, and for the card description. */
type FilterableTile = TilePerformanceRow & {
  roomTypes: string[];
  suitableFor: "floor" | "wall" | "both";
  description: string;
};

type TileSortOption =
  | "viewed_desc"
  | "viewed_asc"
  | "saved_desc"
  | "saved_asc"
  | "purchased_desc"
  | "purchased_asc"
  | "selectionRate_desc"
  | "selectionRate_asc"
  | "name_asc"
  | "name_desc";

const tileSortLabels: Record<TileSortOption, string> = {
  viewed_desc: "Most Viewed",
  viewed_asc: "Least Viewed",
  saved_desc: "Most Liked",
  saved_asc: "Least Liked",
  purchased_desc: "Best Selling",
  purchased_asc: "Least Selling",
  selectionRate_desc: "Best Selection Rate",
  selectionRate_asc: "Worst Selection Rate",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
};

const sortTiles = (items: FilterableTile[], sortBy: TileSortOption): FilterableTile[] => {
  const sorted = [...items];
  switch (sortBy) {
    case "viewed_asc":
      return sorted.sort((a, b) => a.viewed - b.viewed);
    case "saved_desc":
      return sorted.sort((a, b) => b.saved - a.saved);
    case "saved_asc":
      return sorted.sort((a, b) => a.saved - b.saved);
    case "purchased_desc":
      return sorted.sort((a, b) => b.purchased - a.purchased);
    case "purchased_asc":
      return sorted.sort((a, b) => a.purchased - b.purchased);
    case "selectionRate_desc":
      return sorted.sort((a, b) => b.selectionRate - a.selectionRate);
    case "selectionRate_asc":
      return sorted.sort((a, b) => a.selectionRate - b.selectionRate);
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "viewed_desc":
    default:
      return sorted.sort((a, b) => b.viewed - a.viewed);
  }
};

const PAGE_SIZE = 10;

const SUITABLE_FOR_OPTIONS = ["Floor", "Wall", "Floor & Wall"];
const AVAILABILITY_OPTIONS = ["In Stock Ready", "Low Stock", "Out of Stock (Pre-order)"];

/** Same four dimensions the storefront catalog filters on (`buildFilterGroups` in `catalog-utils`), adapted to a tile analytics row instead of a `Product`. */
const buildTileFilterGroups = (items: FilterableTile[]): FilterGroup[] => [
  { title: "Room type", options: Object.values(roomTypeLabels) },
  { title: "Suitable for", options: SUITABLE_FOR_OPTIONS },
  { title: "Size", options: Array.from(new Set(items.map((item) => item.size))).sort() },
  { title: "Availability", options: AVAILABILITY_OPTIONS },
];

const matchesSuitableFor = (item: FilterableTile, selected: string[]) =>
  selected.some((option) => {
    if (option === "Floor") return item.suitableFor === "floor" || item.suitableFor === "both";
    if (option === "Wall") return item.suitableFor === "wall" || item.suitableFor === "both";
    if (option === "Floor & Wall") return item.suitableFor === "both";
    return false;
  });

const filterTiles = (items: FilterableTile[], filters: CatalogFilters): FilterableTile[] =>
  items.filter((item) => {
    if (filters["Room type"].length > 0 && !filters["Room type"].some((room) => item.roomTypes.includes(room))) {
      return false;
    }
    if (filters.Size.length > 0 && !filters.Size.includes(item.size)) return false;
    if (filters.Availability.length > 0) {
      const allowed = filters.Availability.map((label) => availabilityFilterMap[label]);
      if (!allowed.includes(item.stockStatus)) return false;
    }
    if (filters["Suitable for"].length > 0 && !matchesSuitableFor(item, filters["Suitable for"])) return false;
    return true;
  });

type TilesKpi = { label: string; value: string; sub: string; icon: typeof Eye };

const getKpis = (tiles: TileAnalytics): TilesKpi[] => {
  const topViewed = tiles.leaderboards.mostViewed[0];
  const topApplied = tiles.leaderboards.mostApplied[0];
  const topPurchased = tiles.leaderboards.mostPurchased[0];

  return [
    {
      label: "Most Viewed",
      value: topViewed?.name ?? "No data yet",
      sub: topViewed ? `${formatCompactNumber(topViewed.count)} views` : "0 views",
      icon: Eye,
    },
    {
      label: "Most Applied",
      value: topApplied?.name ?? "No data yet",
      sub: topApplied ? `${formatCompactNumber(topApplied.count)} applications` : "0 applications",
      icon: MousePointerSquareDashed,
    },
    {
      label: "Most Purchased",
      value: topPurchased?.name ?? "No data yet",
      sub: topPurchased ? `${formatCompactNumber(topPurchased.count)} sales` : "0 sales",
      icon: ShoppingBasket,
    },
    {
      label: "Avg. Selection Rate",
      value: `${tiles.summary.averageSelectionRate.toFixed(1)}%`,
      sub: `${formatCompactNumber(tiles.summary.totalViews)} total views`,
      icon: MousePointerClick,
    },
    {
      label: "Avg. Conversion",
      value: `${tiles.summary.averagePurchaseConversion.toFixed(1)}%`,
      sub: "Views to purchase",
      icon: Wallet,
    },
  ];
};

const stockStatusMeta = {
  in_stock: { label: "In stock", dot: "bg-green-500", text: "text-green-700" },
  low_stock: { label: "Low stock", dot: "bg-amber-500", text: "text-amber-600" },
  out_of_stock: { label: "Out of stock", dot: "bg-red-500", text: "text-red-600" },
} as const;

const KpiSkeleton = () => (
  <article className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
    <Skeleton className="size-5" />
    <Skeleton className="mt-6 h-3 w-20" />
    <Skeleton className="mt-2 h-6 w-32" />
    <Skeleton className="mt-2 h-3 w-24" />
  </article>
);

const KpiCards = ({ tiles, loading }: { tiles: TileAnalytics | undefined; loading: boolean }) => {
  if (loading && !tiles) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!tiles) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {getKpis(tiles).map((kpi) => {
        const Icon = kpi.icon;
        return (
          <article
            key={kpi.label}
            className="flex flex-col rounded-2xl bg-card p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <Icon className="size-5 stroke-2 text-ink" />
            </div>
            <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              {kpi.label}
            </p>
            <p className="mt-1 truncate text-xl font-black text-ink">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
          </article>
        );
      })}
    </div>
  );
};

const TileListSkeleton = () => (
  <ul className="mt-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <li key={index} className={index > 0 ? "border-t border-border" : undefined}>
        <div className="flex items-center gap-3 py-4">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

const InteractionOverview = ({ tiles, loading }: { tiles: TileAnalytics | undefined; loading: boolean }) => {
  const mostViewed = tiles?.leaderboards.mostViewed.slice(0, 3) ?? [];
  const mostApplied = tiles?.leaderboards.mostApplied.slice(0, 3) ?? [];

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">Interaction Overview</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Snapshot of most viewed and applied tiles.
      </p>
      <div className="mt-5 grid gap-5 sm:gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 sm:p-6">
          <h3 className="text-lg font-bold text-ink">Most Viewed Tiles</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Top picks based on viewer popularity
          </p>
          {loading && !tiles ? (
            <TileListSkeleton />
          ) : mostViewed.length === 0 ? (
            <ApiEmptyState message="No views recorded yet for this period." className="mt-4" />
          ) : (
            <ul className="mt-4">
              {mostViewed.map((tile, index) => (
                <li
                  key={tile.productId}
                  className={index > 0 ? "border-t border-border" : undefined}
                >
                  <Link
                    href={`/analytics/tiles/${tile.productId}`}
                    className="flex items-center gap-3 py-4"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      {tile.image && (
                        <Image
                          src={tile.image}
                          alt={tile.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="56px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {tile.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-data text-sm font-semibold text-ink">
                        {formatCompactNumber(tile.count)} views
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-card p-5 sm:p-6">
          <h3 className="text-lg font-bold text-ink">Most Applied in 3D Rooms</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            By selection rate in rooms display.
          </p>
          {loading && !tiles ? (
            <TileListSkeleton />
          ) : mostApplied.length === 0 ? (
            <ApiEmptyState message="No room applications recorded yet for this period." className="mt-4" />
          ) : (
            <ul className="mt-4">
              {mostApplied.map((tile, index) => (
                <li
                  key={tile.productId}
                  className={index > 0 ? "border-t border-border" : undefined}
                >
                  <Link
                    href={`/analytics/tiles/${tile.productId}`}
                    className="flex items-center gap-3 py-4"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      {tile.image && (
                        <Image
                          src={tile.image}
                          alt={tile.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="56px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {tile.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-data text-sm font-semibold text-ink">
                        {formatCompactNumber(tile.count)} Applications
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

const TableRowSkeleton = ({ columns }: { columns: number }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index}>
        <Skeleton className="h-4 w-20" />
      </TableCell>
    ))}
  </TableRow>
);

const PerformanceMetrics = ({ rows, loading }: { rows: TilePerformanceRow[]; loading: boolean }) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">Performance Metrics</h2>
      <Badge variant="secondary">Top 5 products</Badge>
    </div>
    <div className="mt-5 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU / Code</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Sold</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Applications</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} columns={8} />)
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                <ApiEmptyState message="No product activity recorded yet for this period." />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((product) => {
              const status = stockStatusMeta[product.stockStatus];
              return (
                <TableRow key={product.productId}>
                  <TableCell className="min-w-64">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.collection} • {product.size}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-data text-ink">
                    {product.sku}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-data text-ink">
                      <span className={cn("size-2 rounded-full", status.dot)} />
                      {product.quantityOnHandSqm.toLocaleString()} sqm
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-data text-ink">
                    {product.purchased.toLocaleString()} pcs
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatCompactNumber(product.viewed)} views
                    <span className="mt-0.5 block text-xs font-semibold text-green-600">
                      {product.selectionRate.toFixed(1)}% selection
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatCompactNumber(product.applied)} Apps.
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5", status.text)}>
                      <span className={cn("size-2 rounded-full", status.dot)} /> {status.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/analytics/tiles/${product.productId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    >
                      View Details <ArrowUpRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  </section>
);

const MostLikedProducts = ({ rows, loading }: { rows: TilePerformanceRow[]; loading: boolean }) => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">Most Liked Products</h2>
      <Badge variant="secondary">Top 5 products</Badge>
    </div>
    <div className="mt-5 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU / Code</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Applications</TableHead>
            <TableHead>Likes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} columns={7} />)
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <ApiEmptyState message="No saved tiles recorded yet for this period." />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((product) => {
              const status = stockStatusMeta[product.stockStatus];
              return (
                <TableRow key={product.productId}>
                  <TableCell className="min-w-64">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.collection} • {product.size}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-data text-ink">
                    {product.sku}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatCompactNumber(product.viewed)} views
                    <span className="mt-0.5 block text-xs font-semibold text-green-600">
                      {product.selectionRate.toFixed(1)}% selection
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatCompactNumber(product.applied)} Apps.
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatCompactNumber(product.saved)} Likes
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5", status.text)}>
                      <span className={cn("size-2 rounded-full", status.dot)} /> {status.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/analytics/tiles/${product.productId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    >
                      View Details <ArrowUpRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  </section>
);

const TileCard = ({ product }: { product: FilterableTile }) => {
  const status = {
    in_stock: {
      label: "In stock",
      dot: "bg-green-500",
      badge: "border-green-200 bg-green-50 text-green-700",
    },
    low_stock: {
      label: "Low stock",
      dot: "bg-amber-500",
      badge: "border-amber/30 bg-white/95 text-amber",
    },
    out_of_stock: {
      label: "Out of stock",
      dot: "bg-red-500",
      badge: "border-red-200 bg-red-50 text-red-700",
    },
  }[product.stockStatus];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,39,71,0.10)]">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-b-3xl bg-muted-background">
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <span
          className={cn(
            "absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
            status.badge,
          )}
        >
          <span className={cn("size-2 rounded-full", status.dot)} />
          {status.label}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/35 via-ink/10 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
          <div className="flex items-center justify-between gap-3 rounded-full bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,39,71,0.18)] backdrop-blur-sm sm:px-4 sm:py-3">
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold tracking-tight text-ink uppercase sm:text-xs">
              <ChartNoAxesColumn
                className="size-4 shrink-0"
                strokeWidth={2.25}
              />
              <span className="truncate">{formatCompactNumber(product.viewed)} views</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold tracking-wide text-red-500 uppercase sm:text-[11px]">
              <Heart className="size-3.5" strokeWidth={2.5} />
              {formatCompactNumber(product.saved)} likes
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.collection} • {product.size}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">
          {product.name}
        </h2>
        <p className="text-sm leading-5 text-muted">{product.sku}</p>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {product.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className="text-xl font-bold text-ink">
            {product.quantityOnHandSqm.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">sqm</span>
          </p>
          <Link
            href={`/analytics/tiles/${product.productId}`}
            aria-label={`View ${product.name}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-100 bg-muted-background text-ink hover:bg-primary"
          >
            <ArrowUpRight className="size-5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

const TileCardSkeleton = () => (
  <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-4 h-6 w-1/3" />
    </div>
  </article>
);

const AllProducts = ({ rows, loading }: { rows: FilterableTile[]; loading: boolean }) => {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<TileSortOption>("viewed_desc");

  const filterGroups = useMemo(() => buildTileFilterGroups(rows), [rows]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const searched = normalizedQuery
      ? rows.filter(
          (product) =>
            product.name.toLowerCase().includes(normalizedQuery) ||
            product.sku.toLowerCase().includes(normalizedQuery),
        )
      : rows;
    return sortTiles(filterTiles(searched, filters), sortBy);
  }, [rows, query, filters, sortBy]);

  const handleToggleFilter = (group: keyof CatalogFilters, option: string) => {
    setFilters((current) => toggleFilterOption(current, group, option));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const showingStart = results.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, results.length);
  const visiblePages = useMemo(
    () => getVisiblePages(safePage, totalPages),
    [safePage, totalPages],
  );
  const goToPage = (page: number) =>
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">All Products</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {results.length.toLocaleString()} Products currently managed
      </p>

      <div className="relative mt-5 flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search products, SKUs..."
            className="h-11 rounded-lg pl-11"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as TileSortOption); setCurrentPage(1); }}>
            <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-52">
              <SelectValue>{(value) => tileSortLabels[value as TileSortOption]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(tileSortLabels) as TileSortOption[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {tileSortLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn("h-11 gap-2 border-border text-ink", filtersOpen && "bg-muted-background")}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-pressed={filtersOpen}
          >
            <Filter className="size-4" /> Filters
            {hasActiveFilters(filters) && (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-ink">
                {Object.values(filters).reduce((sum, group) => sum + group.length, 0)}
              </span>
            )}
          </Button>
        </div>

        {filtersOpen && (
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="absolute top-full right-0 z-30 mt-2 max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-[0_14px_32px_rgba(15,39,71,0.16)] sm:p-5">
              <FilterOptionsCard
                bare
                filters={filters}
                onToggle={handleToggleFilter}
                onReset={handleResetFilters}
                groups={filterGroups}
              />
            </div>
          </>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <TileCardSkeleton key={index} />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          No products match your search.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((product) => (
            <TileCard key={product.productId} product={product} />
          ))}
        </div>
      )}

      <footer className="mt-8 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {showingStart} to {showingEnd} of{" "}
          {results.length.toLocaleString()} results
        </p>
        <Pagination className="mx-0 w-auto justify-start py-0 sm:justify-end">
          <PaginationContent className="gap-1 sm:gap-2">
            <PaginationItem>
              <PaginationLink
                href="#"
                size="sm"
                className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                aria-disabled={safePage === 1}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(1);
                }}
              >
                <ChevronsLeft className="size-4" />
                <span className="hidden sm:inline">First</span>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                aria-disabled={safePage === 1}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(safePage - 1);
                }}
              />
            </PaginationItem>
            {visiblePages.map((page, index) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis className="text-muted" />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={safePage === page}
                    size="icon-sm"
                    className={
                      safePage === page
                        ? "border-ink bg-ink text-white hover:bg-ink hover:text-white"
                        : "text-ink hover:text-amber"
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                aria-disabled={safePage === totalPages}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(safePage + 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="sm"
                className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                aria-disabled={safePage === totalPages}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(totalPages);
                }}
              >
                <span className="hidden sm:inline">Last</span>
                <ChevronsRight className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </footer>
    </section>
  );
};

const AnalyticsTilesPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(30);
  const range = periodToRange[period];

  const { data: tiles, loading, error, reload } = useApi(
    () => analyticsApi.tiles({ period: range, limit: 100 }),
    [range],
  );
  // Room type / suitable-for / description aren't part of the analytics row —
  // fetched separately, purely to power the same catalog filters (and the
  // card description) the storefront uses.
  const { data: productsData } = useApi(() => productsApi.list({ limit: 100 }));

  const items = useMemo(() => tiles?.table.items ?? [], [tiles]);
  const filterableItems = useMemo<FilterableTile[]>(() => {
    const meta = new Map(
      (productsData?.items ?? []).map((product) => [
        product.id,
        {
          roomTypes: product.roomTypes.map((roomType) => roomTypeLabels[roomType]),
          suitableFor: suitableForLabels[product.suitableFor],
          description: product.description ?? "",
        },
      ]),
    );
    return items.map((item) => ({
      ...item,
      roomTypes: meta.get(item.productId)?.roomTypes ?? [],
      suitableFor: meta.get(item.productId)?.suitableFor ?? "both",
      description: meta.get(item.productId)?.description ?? "",
    }));
  }, [items, productsData]);
  const mostViewedRows = useMemo(
    () => [...items].sort((a, b) => b.viewed - a.viewed).slice(0, 5),
    [items],
  );
  const mostLikedRows = useMemo(
    () => [...items].sort((a, b) => b.saved - a.saved).slice(0, 5),
    [items],
  );

  return (
    <>
      <AnalyticsPageHeader
        title="Tiles Analytics"
        subtitle="Monitor engagement and conversion performance across the tile catalog"
      >
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AnalyticsPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {error ? (
          <ApiErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <KpiCards tiles={tiles} loading={loading} />
            <InteractionOverview tiles={tiles} loading={loading} />
            <PerformanceMetrics rows={mostViewedRows} loading={loading} />
            <MostLikedProducts rows={mostLikedRows} loading={loading} />
            <AllProducts rows={filterableItems} loading={loading} />
          </>
        )}
      </div>
    </>
  );
};

export default AnalyticsTilesPage;
