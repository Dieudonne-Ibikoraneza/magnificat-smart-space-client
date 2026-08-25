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
  LayoutGrid,
  List,
  MousePointerClick,
  ChartNoAxesColumn,
  MousePointerSquareDashed,
  Search,
  ShoppingBasket,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
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
import { getVisiblePages } from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
import { inventoryProducts } from "@/data/inventory";

const PAGE_SIZE = 10;
const TOTAL_PAGES = 103;
const TOTAL_RESULTS = 842;

type TilesKpi =
  | { label: string; value: string; sub: string; icon: typeof Eye }
  | { label: string; value: string; badge: string; icon: typeof Eye };

const kpis: TilesKpi[] = [
  {
    label: "Most Viewed",
    value: "Calacatta Gold Polished",
    sub: "12.4K views",
    icon: Eye,
  },
  {
    label: "Most Applied",
    value: "Calacatta Gold Polished",
    sub: "12.4K applications",
    icon: MousePointerSquareDashed,
  },
  {
    label: "Most Purchased",
    value: "Calacatta Gold Polished",
    sub: "12.4K sales",
    icon: ShoppingBasket,
  },
  {
    label: "Avg. Selection Rate",
    value: "18.4%",
    badge: "12.4%",
    icon: MousePointerClick,
  },
  { label: "Avg. Conversion", value: "12%", badge: "2.4%", icon: Wallet },
];

const mostViewedTiles = inventoryProducts.slice(0, 3).map((product, index) => ({
  ...product,
  selection: [12, 10.1, 9.2][index],
}));

const mostAppliedTiles = inventoryProducts
  .slice(3, 6)
  .map((product, index) => ({
    ...product,
    size3d: ["60x60cm", "30x60cm", "15x90cm"][index],
    units: [420, 80, 92][index],
  }));

const performanceProducts = [
  {
    id: inventoryProducts[0].id,
    name: "Calacatta Gold",
    collection: "120x60cm Premium Slabs",
    description: "A timeless Italian classic with bold gold veining.",
    image: inventoryProducts[0].image,
    sku: "SLB-CG-001",
    currentStock: 1_240,
    soldStock: 580,
    soldStockLevel: "healthy" as const,
  },
  {
    id: inventoryProducts[1].id,
    name: "Nero Marquina",
    collection: "80x80cm Luxury Black Series",
    description: "Deep black marble with striking white lightning veins.",
    image: inventoryProducts[1].image,
    sku: "SLB-NM-042",
    currentStock: 1_080,
    soldStock: 45,
    soldStockLevel: "low" as const,
  },
  {
    id: inventoryProducts[2].id,
    name: "Carrara White",
    collection: "10x30cm Classic Subway Collection",
    description: "Elegant and versatile tiles for modern kitchen backsplashes.",
    image: inventoryProducts[2].image,
    sku: "SUB-CW-105",
    currentStock: 512,
    soldStock: 14,
    soldStockLevel: "critical" as const,
  },
  {
    id: inventoryProducts[3].id,
    name: "Ocean Hex Mosaic",
    collection: "30x30cm Coastal Geometric Series",
    description: "Vibrant teal and gold accents inspired by the sea.",
    image: inventoryProducts[3].image,
    sku: "MOS-OH-332",
    currentStock: 480,
    soldStock: 520,
    soldStockLevel: "healthy" as const,
  },
];

const stockLevelDot = {
  healthy: "bg-green-500",
  low: "bg-amber-500",
  critical: "bg-red-500",
} as const;

const stockLevelText = {
  healthy: "text-ink",
  low: "text-amber-600",
  critical: "text-red-600",
} as const;

const filteredProducts = inventoryProducts.slice(0, PAGE_SIZE);

const KpiCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      return (
        <article
          key={kpi.label}
          className="flex flex-col rounded-2xl bg-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <Icon className="size-5 stroke-2 text-ink" />
            {"badge" in kpi ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                <MousePointerClick className="size-3" />
                {kpi.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            {kpi.label}
          </p>
          <p className="mt-1 truncate text-xl font-black text-ink">
            {kpi.value}
          </p>
          {"sub" in kpi ? (
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
          ) : null}
        </article>
      );
    })}
  </div>
);

const InteractionOverview = () => (
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
        <ul className="mt-4">
          {mostViewedTiles.map((tile, index) => (
            <li
              key={tile.id}
              className={index > 0 ? "border-t border-border" : undefined}
            >
              <div className="flex items-center gap-3 py-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                  <Image
                    src={tile.image}
                    alt={tile.displayName}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {tile.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Marble Series
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-data text-sm font-semibold text-ink">
                    12.4K views
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-green-600">
                    {tile.selection}% selection
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-card p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink">Most Applied in 3D Rooms</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          By selection rate in rooms display.
        </p>
        <ul className="mt-4">
          {mostAppliedTiles.map((tile, index) => (
            <li
              key={tile.id}
              className={index > 0 ? "border-t border-border" : undefined}
            >
              <div className="flex items-center gap-3 py-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                  <Image
                    src={tile.image}
                    alt={tile.displayName}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {tile.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Marble Series . {tile.size3d}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-data text-sm font-semibold text-ink">
                    12.4K Applications
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tile.units} units
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

const PerformanceMetrics = () => (
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
            <TableHead>Sold Stock</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Applications</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performanceProducts.map((product) => (
            <TableRow key={product.id}>
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
                      {product.collection}
                    </p>
                    <p className="mt-0.5 line-clamp-1 max-w-64 text-xs text-muted-foreground italic">
                      {product.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap font-data text-ink">
                {product.sku}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 font-data text-ink">
                  <span className="size-2 rounded-full bg-green-500" />
                  {product.currentStock.toLocaleString()} pcs
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-data",
                    stockLevelText[product.soldStockLevel],
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      stockLevelDot[product.soldStockLevel],
                    )}
                  />
                  {product.soldStock.toLocaleString()} pcs
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink">
                12.4K views
                <span className="mt-0.5 block text-xs font-semibold text-green-600 flex gap-1">
                  <TrendingUp className="size-4 stroke-2" /> 18% rate
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink">
                12.4K Apps.
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-green-700">
                  <span className="size-2 rounded-full bg-green-500" /> In stock
                </span>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/inventory/${product.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  View Details <ArrowUpRight className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </section>
);

const MostLikedProducts = () => (
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
          {performanceProducts.map((product) => (
            <TableRow key={product.id}>
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
                      {product.collection}
                    </p>
                    <p className="mt-0.5 line-clamp-1 max-w-64 text-xs text-muted-foreground italic">
                      {product.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap font-data text-ink">
                {product.sku}
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink">
                12.4K views
                <span className="mt-0.5 block text-xs font-semibold text-green-600 flex gap-1">
                  <TrendingUp className="size-4 stroke-2" /> 18% rate
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink">
                12.4K Apps.
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink">
                12.4K Likes
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-green-700">
                  <span className="size-2 rounded-full bg-green-500" /> In stock
                </span>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/inventory/${product.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  View Details <ArrowUpRight className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </section>
);

const TileCard = ({
  product,
}: {
  product: (typeof inventoryProducts)[number];
}) => {
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
          alt={product.displayName}
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
              <span className="truncate">{product.views} views</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold tracking-wide text-red-500 uppercase sm:text-[11px]">
              <Heart className="size-3.5" strokeWidth={2.5} />
              {product.views} likes
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.collection} • {product.size}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">
          {product.displayName}
        </h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className="text-xl font-bold text-ink">
            {product.quantity.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">pcs</span>
          </p>
          <Link
            href={`/admin/inventory/${product.id}`}
            aria-label={`View ${product.displayName}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-100 bg-muted-background text-ink hover:bg-primary"
          >
            <ArrowUpRight className="size-5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

const AllProducts = () => {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const safePage = Math.min(Math.max(currentPage, 1), TOTAL_PAGES);
  const showingStart = (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, TOTAL_RESULTS);
  const visiblePages = useMemo(
    () => getVisiblePages(safePage, TOTAL_PAGES),
    [safePage],
  );
  const goToPage = (page: number) =>
    setCurrentPage(Math.min(Math.max(page, 1), TOTAL_PAGES));

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return filteredProducts;
    return filteredProducts.filter((product) =>
      product.displayName.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <section>
      <h2 className="text-lg font-bold text-ink">All Products</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {TOTAL_RESULTS.toLocaleString()} Products currently managed
      </p>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, SKUs..."
            className="h-11 rounded-lg pl-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
          <Select defaultValue="all">
            <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-36">
              <SelectValue>{() => "Category"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="marble">Marble Series</SelectItem>
              <SelectItem value="mosaic">Mosaic Series</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-32">
              <SelectValue>{() => "Status"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="low_stock">Low stock</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 border-border text-ink"
          >
            <Filter className="size-4" /> Filters
          </Button>
          <div className="flex items-center overflow-hidden rounded-lg border border-border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={cn(
                "h-11 rounded-none",
                view === "grid"
                  ? "bg-ink text-primary hover:bg-ink/90 hover:text-primary"
                  : "text-ink",
              )}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "h-11 rounded-none",
                view === "list"
                  ? "bg-ink text-primary hover:bg-ink/90 hover:text-primary"
                  : "text-ink",
              )}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          No products match your search.
        </p>
      ) : (
        <div
          className={cn(
            "mt-6 grid gap-5",
            view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
          )}
        >
          {results.map((product) => (
            <TileCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <footer className="mt-8 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {showingStart} to {showingEnd} of{" "}
          {TOTAL_RESULTS.toLocaleString()} results
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
                aria-disabled={safePage === TOTAL_PAGES}
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
                aria-disabled={safePage === TOTAL_PAGES}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(TOTAL_PAGES);
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

const AdminTilesAnalyticsPage = () => (
  <>
    <AdminPageHeader
      title="Tiles Analytics"
      subtitle="Monitor engagement and conversion performance across the tile catalog"
    />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards />
      <InteractionOverview />
      <PerformanceMetrics />
      <MostLikedProducts />
      <AllProducts />
    </div>
  </>
);

export default AdminTilesAnalyticsPage;
