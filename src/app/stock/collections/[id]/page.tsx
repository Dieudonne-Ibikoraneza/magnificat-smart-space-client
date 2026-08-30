"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Clock,
  LayoutGrid,
  List,
  PackageOpen,
  Plus,
  Search,
} from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { StockDetailHeader } from "@/app/stock/layout";
import { InventoryProductCard } from "@/app/stock/inventory/page";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { DeleteCollectionDialog, EditCollectionDialog } from "@/components/edit-collection-dialog";
import { getVisiblePages } from "@/lib/catalog-utils";
import { collectionsApi, productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { StockStatus } from "@/lib/api/types";
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

const statusLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function StockCollectionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suitableFor, setSuitableFor] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: collection,
    loading: collectionLoading,
    error: collectionError,
    reload: reloadCollection,
  } = useApi(() => collectionsApi.get(id), [id]);

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApi(() => productsApi.list({ collectionId: id, limit: 100 }), [id]);
  const products = useMemo(() => productsData?.items ?? [], [productsData]);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const term = query.trim().toLowerCase();
        const matchesQuery =
          term === "" ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term);
        const matchesSuitableFor = suitableFor === "all" || product.suitableFor === suitableFor;
        const matchesStatus = status === "all" || product.stockStatus === status;
        return matchesQuery && matchesSuitableFor && matchesStatus;
      }),
    [products, query, suitableFor, status],
  );

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const showingStart = totalResults === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, totalResults);

  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  if (collectionLoading) return <ApiLoading label="Loading collection…" className="py-24" />;
  if (collectionError) return <ApiErrorState message={collectionError} className="my-16" />;
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
            <EditCollectionDialog collection={collection} onUpdated={reloadCollection} />
            <DeleteCollectionDialog collection={collection} onDeleted={() => router.push("/stock/collections")} />
          </>
        }
        meta={
          <>
            <p className="w-full max-w-xl text-sm leading-6 text-muted sm:text-base">{collection.description}</p>
            <div className="flex w-full items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-ink">
                {products.length} {products.length === 1 ? "Product" : "Products"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted sm:text-sm">
                <Clock className="size-4" strokeWidth={2} aria-hidden="true" />
                Last updated {timeAgo(collection.updatedAt)}
              </span>
            </div>
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
                <SelectValue>{(value) => (value === "all" ? "Status" : statusLabels[value as StockStatus])}</SelectValue>
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
        {productsLoading ? (
          <ApiLoading label="Loading products…" className="py-24" />
        ) : productsError ? (
          <ApiErrorState message={productsError} onRetry={reloadProducts} className="my-16" />
        ) : totalResults === 0 && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8ded2] bg-white px-6 py-16 text-center shadow-sm sm:py-20">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-ink">
              <PackageOpen className="size-8" strokeWidth={1.6} />
            </span>
            <h2 className="mt-5 text-xl font-bold text-ink sm:text-2xl">This collection is ready for products</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted sm:text-base">
              No products have been added to this collection yet. Add the first product to start building its catalog.
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/stock/inventory/new?collectionId=${id}`} />}
              className="mt-6 h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        ) : totalResults === 0 ? (
          <ApiEmptyState message="No products match the selected filters." className="py-16" />
        ) : view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((product) => (
              <InventoryProductCard key={product.id} product={product} />
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
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="p-4">
                      <Link
                        href={`/stock/inventory/${product.id}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="max-w-xs truncate text-xs text-muted">{product.description}</p>
                    </td>
                    <td className="p-4 text-muted">{product.sku}</td>
                    <td className="p-4 font-semibold">
                      {(product.quantityOnHandSqm ?? 0).toLocaleString()} sqm
                    </td>
                    <td className="p-4">RWF {Math.round(Number(product.price)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!productsLoading && !productsError && totalResults > 0 && (
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
}
