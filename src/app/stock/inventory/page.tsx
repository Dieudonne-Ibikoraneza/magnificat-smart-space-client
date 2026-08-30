"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { getVisiblePages } from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
import { StockPageHeader } from "@/app/stock/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { ApiProduct, StockStatus } from "@/lib/api/types";
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

const PAGE_SIZE = 10;

const statusStyles: Record<
  StockStatus,
  { label: string; dot: string; text: string; badge: string; quantity: string }
> = {
  in_stock: {
    label: "In stock",
    dot: "bg-green-500",
    text: "text-green-700",
    badge: "border-green-200 bg-green-50 text-green-700",
    quantity: "text-ink",
  },
  low_stock: {
    label: "Low stock",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "border-amber/30 bg-white/95 text-amber",
    quantity: "text-amber-600",
  },
  out_of_stock: {
    label: "Out of stock",
    dot: "bg-red-500",
    text: "text-red-600",
    badge: "border-red-200 bg-red-50 text-red-700",
    quantity: "text-red-600",
  },
};

const getStatus = (product: ApiProduct) => statusStyles[product.stockStatus];

export const InventoryProductCard = ({ product, basePath = "/stock/inventory" }: { product: ApiProduct; basePath?: string }) => {
  const status = getStatus(product);
  const quantity = product.quantityOnHandSqm ?? 0;

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

        <Link
          href={`${basePath}/${product.id}`}
          aria-label={`Open ${product.name} inventory details`}
          className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-105 hover:bg-white"
        >
          <ArrowUpRight className="size-5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.size} • {product.sku}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">
          {product.name}
        </h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description || "No description yet."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className={cn("text-xl font-bold", status.quantity)}>
            {quantity.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">sqm</span>
          </p>
          <Button
            type="button"
            nativeButton={false}
            render={<Link href={`${basePath}/${product.id}`} />}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
          >
            <Eye className="size-3.5" /> View
          </Button>
        </div>
      </div>
    </article>
  );
};

const InventoryPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suitableFor, setSuitableFor] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, reload } = useApi(() => productsApi.list({ limit: 100 }));
  const allProducts = useMemo(() => data?.items ?? [], [data]);

  const results = useMemo(
    () =>
      allProducts.filter((product) => {
        const term = query.trim().toLowerCase();
        const matchesQuery =
          term === "" ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term);
        const matchesSuitableFor = suitableFor === "all" || product.suitableFor === suitableFor;
        const matchesStatus = status === "all" || product.stockStatus === status;
        return matchesQuery && matchesSuitableFor && matchesStatus;
      }),
    [allProducts, query, suitableFor, status],
  );

  const totalResults = results.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const showingStart = totalResults === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, totalResults);

  const pageItems = useMemo(
    () => results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [results, safePage],
  );

  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <>
      <StockPageHeader
        title="Inventory"
        subtitle={loading ? "Loading products…" : `${totalResults.toLocaleString()} Products currently managed`}
      >
        <Button
          type="button"
          onClick={() => router.push("/stock/inventory/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add New Product
        </Button>
      </StockPageHeader>

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
              aria-label="Search inventory"
              className="h-11 rounded-full bg-[#fafbfc] pl-11 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Select
              value={suitableFor}
              onValueChange={(value) => {
                setSuitableFor(value ?? "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 min-w-0 bg-card sm:w-40">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "Suitable for"
                      : value === "FLOOR"
                        ? "Floor"
                        : value === "WALL"
                          ? "Wall"
                          : "Floor & Wall"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Suitable for: All</SelectItem>
                <SelectItem value="FLOOR">Floor</SelectItem>
                <SelectItem value="WALL">Wall</SelectItem>
                <SelectItem value="BOTH">Floor &amp; Wall</SelectItem>
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
                      : statusStyles[value as StockStatus]?.label
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
        {loading ? (
          <ApiLoading label="Loading inventory…" className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : totalResults === 0 ? (
          <ApiEmptyState message="No products match your filters." className="py-16" />
        ) : view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((product) => (
              <InventoryProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-220">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-4">Product</TableHead>
                    <TableHead className="px-3 py-4">SKU / Code</TableHead>
                    <TableHead className="px-3 py-4">Size / Format</TableHead>
                    <TableHead className="px-3 py-4">Current Stock</TableHead>
                    <TableHead className="px-3 py-4">
                      Unit Price (RWF)
                    </TableHead>
                    <TableHead className="px-3 py-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((product) => {
                    const itemStatus = getStatus(product);
                    const quantity = product.quantityOnHandSqm ?? 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative size-17.5 shrink-0 overflow-hidden rounded-sm">
                              <Image
                                src={product.image}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <Link
                                href={`/stock/inventory/${product.id}`}
                                className="font-bold text-ink text-lg leading-6 hover:underline"
                              >
                                {product.name}
                              </Link>
                              <p className="mt-1 text-xs text-muted-foreground italic">
                                {product.size}
                              </p>
                              <p className="mt-0.5 line-clamp-1 max-w-56 text-sm font-medium text-muted-foreground">
                                {product.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-sm text-ink">
                          {product.sku}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-ink">
                          {product.size}
                        </TableCell>
                        <TableCell className="p-4">
                          <span
                            className={`inline-flex items-center gap-2 font-data font-semibold ${itemStatus.text}`}
                          >
                            <span
                              className={`size-2 rounded-full ${itemStatus.dot}`}
                            />
                            {quantity.toLocaleString()}{" "}
                            <span className="font-sans text-sm font-normal text-muted-foreground">
                              sqm
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="p-4 font-data text-base font-medium text-ink">
                          {Math.round(Number(product.price)).toLocaleString()}
                        </TableCell>
                        <TableCell className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              nativeButton={false}
                              render={<Link href={`/stock/inventory/${product.id}`} />}
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${product.name}`}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>

      {!loading && !error && totalResults > 0 && (
        <footer className="mt-8 flex flex-col gap-4 text-sm text-[#53604d] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {showingStart} to {showingEnd} of {totalResults.toLocaleString()} results
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
      )}
    </>
  );
};

export default InventoryPage;
