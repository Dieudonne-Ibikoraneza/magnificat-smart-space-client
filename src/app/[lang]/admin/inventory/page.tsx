"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronsLeft,
  ChevronsRight,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { getVisiblePages } from "@/lib/catalog-utils";
import { staffStockDisplay } from "@/lib/stock-display";
import { DashboardPageHeader as AdminPageHeader } from "@/components/dashboard-page-headers";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { AdminInventoryProductCard } from "@/components/admin-inventory-product-card";
import { productsApi } from "@/lib/api";
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

/** Filter dropdown label keys only — the real, server-computed `StockStatus` enum, distinct from the "Fully reserved" nuance `staffStockDisplay` adds per-row below. */
const FILTER_STATUS_KEYS: Record<StockStatus, string> = {
  in_stock: "staff.stockStatus.in_stock",
  low_stock: "staff.stockStatus.low_stock",
  out_of_stock: "staff.stockStatus.out_of_stock",
};

const AdminInventoryPage = () => {
  const { t } = useTranslation();
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
      <AdminPageHeader
        title={t("stock.inventory.title")}
        subtitle={loading ? t("stock.inventory.loadingProducts") : t("stock.inventory.productsManaged", { count: totalResults })}
      >
        <Button
          type="button"
          onClick={() => router.push("/admin/inventory/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t("stock.inventory.addNewProduct")}
        </Button>
      </AdminPageHeader>

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
              placeholder={t("stock.inventory.searchPlaceholder")}
              aria-label={t("stock.inventory.searchAria")}
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
                      ? t("stock.inventory.suitableForTrigger")
                      : value === "FLOOR"
                        ? t("stock.inventory.floor")
                        : value === "WALL"
                          ? t("stock.inventory.wall")
                          : t("stock.inventory.floorAndWall")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.inventory.suitableForAll")}</SelectItem>
                <SelectItem value="FLOOR">{t("stock.inventory.floor")}</SelectItem>
                <SelectItem value="WALL">{t("stock.inventory.wall")}</SelectItem>
                <SelectItem value="BOTH">{t("stock.inventory.floorAndWall")}</SelectItem>
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
                      ? t("stock.inventory.statusTrigger")
                      : t(FILTER_STATUS_KEYS[value as StockStatus])
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.inventory.allStatus")}</SelectItem>
                <SelectItem value="in_stock">{t("staff.stockStatus.in_stock")}</SelectItem>
                <SelectItem value="low_stock">{t("staff.stockStatus.low_stock")}</SelectItem>
                <SelectItem value="out_of_stock">{t("staff.stockStatus.out_of_stock")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex h-11 w-fit items-center justify-center justify-self-end rounded-lg bg-[#f4f5f6] p-1 sm:w-auto">
              <Button
                type="button"
                variant={view === "list" ? "default" : "ghost"}
                size="icon-sm"
                aria-label={t("stock.inventory.listView")}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List className="size-4" />
              </Button>
              <Button
                type="button"
                variant={view === "grid" ? "default" : "ghost"}
                size="icon-sm"
                aria-label={t("stock.inventory.gridView")}
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
          <ApiLoading label={t("stock.inventory.loading")} className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : totalResults === 0 ? (
          <ApiEmptyState message={t("stock.inventory.noResults")} className="py-16" />
        ) : view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((product) => (
              <AdminInventoryProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-220">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-4">{t("stock.inventory.colProduct")}</TableHead>
                    <TableHead className="px-3 py-4">{t("stock.inventory.colSku")}</TableHead>
                    <TableHead className="px-3 py-4">{t("stock.inventory.colSize")}</TableHead>
                    <TableHead className="px-3 py-4">{t("stock.inventory.colStock")}</TableHead>
                    <TableHead className="px-3 py-4">
                      {t("stock.inventory.colPrice")}
                    </TableHead>
                    <TableHead className="px-3 py-4 text-right">
                      {t("stock.inventory.colActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((product) => {
                    const itemStatus = staffStockDisplay(product);
                    const quantity = itemStatus.quantityOnHandSqm;
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
                                href={`/admin/inventory/${product.id}`}
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
                            <span className="font-sans text-sm font-normal text-muted-foreground">{t("stock.inventory.sqm")}</span>
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
                              render={<Link href={`/admin/inventory/${product.id}`} />}
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("stock.inventory.viewAria", { name: product.name })}
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
            {t("stock.inventory.showingRange", { start: showingStart, end: showingEnd, total: totalResults.toLocaleString() })}
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
                  <span className="hidden sm:inline">{t("sales.newOrder.productStep.first")}</span>
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
                  <span className="hidden sm:inline">{t("sales.newOrder.productStep.last")}</span>
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

export default AdminInventoryPage;
