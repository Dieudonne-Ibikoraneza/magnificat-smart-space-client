"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Heart,
  LayoutGrid,
  List,
  ChartNoAxesColumn,
  Search,
  BadgeCheck,
  Smile,
  BroomSparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  TrendingUpDown,
  Minus,
} from "lucide-react";
import { AnalyticsPageHeader } from "@/app/analytics/layout";
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

const kpis = [
  {
    label: "Total Recommendations",
    value: "1,220,291",
    change: "12.4%",
    icon: BroomSparkles,
  },
  {
    label: "Acceptance Rate",
    value: "33.3%",
    change: "4.2%",
    icon: BadgeCheck,
  },
  {
    label: "Avg. Match Score",
    value: "89.2%",
    change: "2.4%",
    icon: TrendingUpDown,
  },
];

const sentiments = [
  { label: "72%", value: 72, icon: ThumbsUp, bar: "bg-blue-500", chip: "bg-blue-100 text-blue-600" },
  { label: "20%", value: 20, icon: Minus, bar: "bg-muted-foreground/40", chip: "bg-muted-background text-muted-foreground" },
  { label: "8%", value: 8, icon: ThumbsDown, bar: "bg-red-500", chip: "bg-red-100 text-red-600" },
];

const performanceProducts = [
  {
    id: "perf-1",
    name: "Calacatta Gold",
    collection: "120x60cm Premium Slabs",
    description: "A timeless Italian classic with bold gold veining.",
    image: inventoryProducts[0].image,
    sku: "SLB-CG-001",
    currentStock: 1_240,
    soldStock: 580,
    soldStockLevel: "healthy" as const,
    recommendations: "1,029,091",
  },
  {
    id: "perf-2",
    name: "Nero Marquina",
    collection: "80x80cm Luxury Black Series",
    description: "Deep black marble with striking white lightning veins.",
    image: inventoryProducts[1].image,
    sku: "SLB-NM-042",
    currentStock: 1_080,
    soldStock: 45,
    soldStockLevel: "low" as const,
    recommendations: "201,012",
  },
  {
    id: "perf-3",
    name: "Carrara White",
    collection: "10x30cm Classic Subway Collection",
    description: "Elegant and versatile tiles for modern kitchen backsplashes.",
    image: inventoryProducts[2].image,
    sku: "SUB-CW-105",
    currentStock: 512,
    soldStock: 14,
    soldStockLevel: "critical" as const,
    recommendations: "100,022",
  },
  {
    id: "perf-4",
    name: "Ocean Hex Mosaic",
    collection: "30x30cm Coastal Geometric Series",
    description: "Vibrant teal and gold accents inspired by the sea.",
    image: inventoryProducts[3].image,
    sku: "MOS-OH-332",
    currentStock: 480,
    soldStock: 520,
    soldStockLevel: "healthy" as const,
    recommendations: "98,201",
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
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      return (
        <article
          key={kpi.label}
          className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <Icon className="size-5 stroke-2" />
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
              <TrendingUp className="size-3" />
              {kpi.change}
            </span>
          </div>
          <div className="mt-4 flex flex-1 flex-col justify-end">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-black text-ink sm:text-3xl">
              {kpi.value}
            </p>
          </div>
        </article>
      );
    })}
    <article className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          Feedback Sentiment
        </p>
        <Smile className="size-5 shrink-0 stroke-2 text-ink" />
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-end space-y-2.5">
        {sentiments.map((sentiment) => {
          const Icon = sentiment.icon;
          return (
            <div key={sentiment.label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  sentiment.chip,
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted-background">
                <div
                  className={cn("h-full rounded-full", sentiment.bar)}
                  style={{ width: `${sentiment.value}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-bold text-ink">
                {sentiment.label}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  </div>
);

const TopRecommendedProducts = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">Top Recommended Products</h2>
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
            <TableHead>Recommendations</TableHead>
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
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      stockLevelDot[product.soldStockLevel],
                    )}
                  />
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
                <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-green-600">
                  <TrendingUp className="size-4 stroke-2" /> 18% rate
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap font-data text-ink">
                {product.recommendations}
              </TableCell>
              <TableCell>
                <Link
                  href={`/stock/inventory/${product.id}`}
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
              <span className="truncate">{product.views} recommendations</span>
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
            href={`/stock/inventory/${product.id}`}
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

const AnalyticsAiPage = () => (
  <>
    <AnalyticsPageHeader
      title="AI Analytics"
      subtitle="Monitor how automated suggestions drive customer engagement and product discovery across the platform."
    />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <KpiCards />
      <TopRecommendedProducts />
      <AllProducts />
    </div>
  </>
);

export default AnalyticsAiPage;
