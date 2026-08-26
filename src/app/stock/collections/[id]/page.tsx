"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  LayoutGrid,
  List,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { notFound } from "next/navigation";
import { StockDetailHeader } from "@/app/stock/layout";
import { getCollectionById } from "@/data/collections";
import { inventoryProducts } from "@/data/inventory";
import { InventoryProductCard as InventoryCard } from "@/app/stock/inventory/page";
import type { InventoryProduct } from "@/data/inventory";
import { getVisiblePages } from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;
const TOTAL_PAGES = 103;
const TOTAL_RESULTS = 842;

const statusStyles = {
  in_stock: {
    label: "In stock",
    dot: "bg-green-500",
    badge: "border-green-200 bg-green-50 text-green-700",
    quantity: "text-ink",
  },
  low_stock: {
    label: "Low stock",
    dot: "bg-amber-500",
    badge: "border-amber/30 bg-white/95 text-amber",
    quantity: "text-amber-600",
  },
  out_of_stock: {
    label: "Out of stock",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-700",
    quantity: "text-red-600",
  },
} as const;

/* Product cards are intentionally shared with the stock inventory page. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CollectionProductCard = ({ product }: { product: InventoryProduct }) => {
  const status = statusStyles[product.stockStatus];
  const quantity = product.quantity;

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
            "absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm",
            status.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>

        <Link
          href={`/stock/inventory/${product.id}`}
          aria-label={`Open ${product.displayName}`}
          className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-105 hover:bg-white"
        >
          <ArrowUpRight className="size-4" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#d4c09e] uppercase">
          {product.collection} • {product.size}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-lg">
          {product.displayName}
        </h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className={cn("text-xl font-bold", status.quantity)}>
            {quantity.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">pcs</span>
          </p>

          <div className="flex items-center overflow-hidden rounded-full bg-primary shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-none text-ink hover:bg-white/45"
              aria-label={`Edit ${product.displayName}`}
            >
              <Pencil className="size-4" strokeWidth={2.25} />
            </Button>
            <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-none text-ink hover:bg-white/45 hover:text-red-600"
              aria-label={`Delete ${product.displayName}`}
            >
              <Trash2 className="size-4" strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default function StockCollectionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const collection = getCollectionById(id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const products = inventoryProducts;

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const text = `${product.displayName} ${product.description} ${product.id}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (status === "all" || product.stockStatus === status)
        );
      }),
    [products, query, status],
  );

  const safePage = Math.min(Math.max(currentPage, 1), TOTAL_PAGES);
  const showingStart =
    filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, TOTAL_RESULTS);

  const pageItems = useMemo(() => {
    if (filtered.length === 0) return [];
    const count = Math.max(0, showingEnd - showingStart + 1);
    const offset = (safePage - 1) * PAGE_SIZE;
    return Array.from({ length: count }, (_, index) => {
      const source = filtered[(offset + index) % filtered.length];
      return {
        product: source,
        key: `${source.id}-p${safePage}-${index}`,
      };
    });
  }, [filtered, safePage, showingEnd, showingStart]);

  const visiblePages = useMemo(
    () => getVisiblePages(safePage, TOTAL_PAGES),
    [safePage],
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), TOTAL_PAGES));
  };

  if (!collection) notFound();

  return (
    <>
      <StockDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/stock/overview" },
          { label: "Collections", href: "/stock/collections" },
          { label: collection.title },
        ]}
        title={collection.title}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 font-bold uppercase px-4"
            >
              <Pencil className="size-4 stroke-3" />
              Edit Collection
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-12 gap-2 font-bold uppercase px-4"
            >
              <Trash2 className="size-4 stroke-3" />
              Delete Collection
            </Button>
          </>
        }
        meta={
          <>
            <p className="w-full max-w-2xl text-sm text-muted sm:text-base">{collection.description}</p>
            <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-ink sm:text-sm">
              {products.length} Products
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted sm:text-sm">
              <Clock className="size-4" strokeWidth={2} aria-hidden="true" />
              Last updated 2 hours ago
            </span>
          </>
        }
      />

      <section className="mt-6 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:mt-8 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#71809a]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search products, SKUs..."
              aria-label="Search collection products"
              className="h-11 rounded-full bg-[#fafbfc] pl-11 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Select defaultValue="all">
              <SelectTrigger className="h-11 min-w-0 bg-card sm:w-36">
                <SelectValue>
                  {(value) => (value === "all" ? "Category" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="floor">Floor Tile</SelectItem>
                <SelectItem value="wall">Wall Tile</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value ?? "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 min-w-0 bg-card sm:w-32">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "Status"
                      : statusStyles[value as keyof typeof statusStyles]?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-center gap-2"
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
            <div className="flex h-11 w-fit items-center justify-center justify-self-end rounded-lg bg-[#f4f5f6] p-1 sm:w-auto">
              <Button
                type="button"
                variant={view === "list" ? "default" : "ghost"}
                size="icon-sm"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List className="size-4" />
              </Button>
              <Button
                type="button"
                variant={view === "grid" ? "default" : "ghost"}
                size="icon-sm"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 sm:mt-8">
        {view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map(({ key, product }) => (
              <InventoryCard key={key} product={product} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted-background text-xs text-muted uppercase">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Current stock</th>
                  <th className="p-4">Unit price</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(({ key, product }) => {
                  const quantity = product.quantity;
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={product.image}
                            alt=""
                            width={48}
                            height={48}
                            unoptimized
                            className="size-12 rounded object-cover"
                          />
                          <div>
                            <Link
                              href={`/stock/inventory/${product.id}`}
                              className="font-semibold text-ink hover:underline"
                            >
                              {product.displayName}
                            </Link>
                            <p className="max-w-xs truncate text-xs text-muted">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted">
                        {product.sku}
                      </td>
                      <td className="p-4 font-semibold">
                        {quantity.toLocaleString()} pcs
                      </td>
                      <td className="p-4">
                        RWF {product.price.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center overflow-hidden rounded-full bg-primary w-fit">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-none text-ink hover:bg-white/45"
                            aria-label={`Edit ${product.displayName}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-none text-ink hover:bg-white/45 hover:text-red-600"
                            aria-label={`Delete ${product.displayName}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="mt-8 flex flex-col gap-4 text-sm text-[#53604d] sm:flex-row sm:items-center sm:justify-between">
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
    </>
  );
}
