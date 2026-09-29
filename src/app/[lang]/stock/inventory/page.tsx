"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownWideNarrow,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { getVisiblePages } from "@/lib/catalog-utils";
import { staffStockDisplay } from "@/lib/stock-display";
import { DashboardPageHeader as StockPageHeader } from "@/components/dashboard-page-headers";
import {
  ApiErrorState,
  ApiLoading,
} from "@/components/api-state";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { DeleteProductButton } from "@/components/delete-product-button";
import { InventoryProductCard } from "@/components/inventory-product-card";
import { InventoryEmptyState } from "@/components/inventory-empty-state";
import { productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { RoomType, StockStatus } from "@/lib/api/types";
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

const PAGE_SIZE = 20;

/** Filter dropdown label keys only — the real, server-computed `StockStatus` enum, distinct from the "Fully reserved" nuance `staffStockDisplay` adds per-row below. */
const FILTER_STATUS_KEYS: Record<StockStatus, string> = {
  in_stock: "staff.stockStatus.in_stock",
  low_stock: "staff.stockStatus.low_stock",
  out_of_stock: "staff.stockStatus.out_of_stock",
};

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};
const roomTypeOptions = Object.keys(ROOM_TYPE_KEYS) as RoomType[];

type SortOption = "newest" | "oldest";

const InventoryPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suitableFor, setSuitableFor] = useState("all");
  const [status, setStatus] = useState("all");
  const [roomType, setRoomType] = useState("all");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const activeFilterCount =
    Number(query.trim() !== "") +
    Number(suitableFor !== "all") +
    Number(status !== "all") +
    Number(roomType !== "all") +
    Number(size !== "all");

  const { data, loading, error, reload } = useApi(
    () =>
      productsApi.list({
        page: currentPage,
        limit: PAGE_SIZE,
        search: query.trim() || undefined,
        suitableFor:
          suitableFor === "all"
            ? undefined
            : (suitableFor as "WALL" | "FLOOR" | "BOTH"),
        roomType: roomType === "all" ? undefined : (roomType as RoomType),
        size: size === "all" ? undefined : size,
        stockStatus: status === "all" ? undefined : (status as StockStatus),
        sort,
      }),
    [currentPage, query, suitableFor, status, roomType, size, sort],
  );
  const { data: filterOptions } = useApi(() => productsApi.filterOptions());

  const sizeOptions = filterOptions?.sizes ?? [];

  const totalResults = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const showingStart = totalResults === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, totalResults);

  const pageItems = data?.items ?? [];

  const visiblePages = useMemo(
    () => getVisiblePages(safePage, totalPages),
    [safePage, totalPages],
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <>
      <StockPageHeader
        title={t("stock.inventory.title")}
        subtitle={
          loading
            ? t("stock.inventory.loadingProducts")
            : t("stock.inventory.productsManaged", { count: totalResults })
        }
      >
        <Button
          type="button"
          onClick={() => router.push("/stock/inventory/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t("stock.inventory.addNewProduct")}
        </Button>
      </StockPageHeader>

      <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:mt-8 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#F2F8D9] text-[#324515]"><SlidersHorizontal className="size-4" /></span>
            <div>
              <h2 className="text-sm font-bold text-ink">{t("stock.inventory.filtersTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("stock.inventory.filtersSubtitle")}</p>
            </div>
            {activeFilterCount > 0 && <span className="rounded-full bg-[#F2F8D9] px-2.5 py-1 text-xs font-bold text-[#324515]">{activeFilterCount}</span>}
          </div>
          {activeFilterCount > 0 && <Button type="button" variant="ghost" onClick={() => { setQuery(""); setSuitableFor("all"); setStatus("all"); setRoomType("all"); setSize("all"); setCurrentPage(1); }} className="h-9 gap-2 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-[#F7F8F2] hover:text-ink"><RotateCcw className="size-3.5" />{t("stock.inventory.clearFilters")}</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-[1_1_260px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71809a]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={t("stock.inventory.searchPlaceholder")}
              aria-label={t("stock.inventory.searchAria")}
              className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F9F6] pl-10 text-sm placeholder:text-muted-foreground/80 focus-visible:border-primary/70"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Select
              value={suitableFor}
              onValueChange={(value) => {
                setSuitableFor(value ?? "all");
                setCurrentPage(1);
              }}
            >
            <SelectTrigger className={`h-12 min-w-0 rounded-xl bg-white sm:w-44 ${suitableFor !== "all" ? "border-primary/60 bg-[#F8FBEF]" : "border-[#E5E7EB]"}`}>
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
                <SelectItem value="all">
                  {t("stock.inventory.suitableForAll")}
                </SelectItem>
                <SelectItem value="FLOOR">
                  {t("stock.inventory.floor")}
                </SelectItem>
                <SelectItem value="WALL">
                  {t("stock.inventory.wall")}
                </SelectItem>
                <SelectItem value="BOTH">
                  {t("stock.inventory.floorAndWall")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value ?? "all");
                setCurrentPage(1);
              }}
            >
            <SelectTrigger className={`h-12 min-w-0 rounded-xl bg-white sm:w-40 ${status !== "all" ? "border-primary/60 bg-[#F8FBEF]" : "border-[#E5E7EB]"}`}>
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? t("stock.inventory.statusTrigger")
                      : t(FILTER_STATUS_KEYS[value as StockStatus])
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("stock.inventory.allStatus")}
                </SelectItem>
                <SelectItem value="in_stock">
                  {t("staff.stockStatus.in_stock")}
                </SelectItem>
                <SelectItem value="low_stock">
                  {t("staff.stockStatus.low_stock")}
                </SelectItem>
                <SelectItem value="out_of_stock">
                  {t("staff.stockStatus.out_of_stock")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roomType}
              onValueChange={(value) => {
                setRoomType(value ?? "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className={`h-12 min-w-0 rounded-xl bg-white sm:w-44 ${roomType !== "all" ? "border-primary/60 bg-[#F8FBEF]" : "border-[#E5E7EB]"}`}>
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? t("stock.inventory.roomTypeTrigger")
                      : t(ROOM_TYPE_KEYS[value as RoomType])
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("stock.inventory.roomTypeAll")}
                </SelectItem>
                {roomTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(ROOM_TYPE_KEYS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={size}
              onValueChange={(value) => {
                setSize(value ?? "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className={`h-12 min-w-0 rounded-xl bg-white sm:w-36 ${size !== "all" ? "border-primary/60 bg-[#F8FBEF]" : "border-[#E5E7EB]"}`}>
                <SelectValue>
                  {(value) =>
                    value === "all" ? t("stock.inventory.sizeTrigger") : value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("stock.inventory.sizeAll")}
                </SelectItem>
                {sizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort((value as SortOption) ?? "newest");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-12 min-w-0 gap-1.5 rounded-xl border-[#E5E7EB] bg-white sm:w-44">
                <ArrowDownWideNarrow className="size-4 shrink-0 text-[#71809a]" />
                <SelectValue>
                  {(value) =>
                    value === "oldest"
                      ? t("stock.inventory.sortOldest")
                      : t("stock.inventory.sortNewest")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  {t("stock.inventory.sortNewest")}
                </SelectItem>
                <SelectItem value="oldest">
                  {t("stock.inventory.sortOldest")}
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex h-12 w-fit items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F5F6F2] p-1">
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
        ) : pageItems.length === 0 ? (
          <InventoryEmptyState
            searchTerm={query}
            hasFilters={suitableFor !== "all" || status !== "all" || roomType !== "all" || size !== "all"}
            onClearSearch={() => { setQuery(""); setCurrentPage(1); }}
            onResetFilters={() => { setQuery(""); setSuitableFor("all"); setStatus("all"); setRoomType("all"); setSize("all"); setCurrentPage(1); }}
          />
        ) : view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((product) => (
              <InventoryProductCard
                key={product.id}
                product={product}
                onChanged={reload}
              />
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-220">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-4">
                      {t("stock.inventory.colProduct")}
                    </TableHead>
                    <TableHead className="px-3 py-4">
                      {t("stock.inventory.colSku")}
                    </TableHead>
                    <TableHead className="px-3 py-4">
                      {t("stock.inventory.colSize")}
                    </TableHead>
                    <TableHead className="px-3 py-4">
                      {t("stock.inventory.colStock")}
                    </TableHead>
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
                              {t("stock.inventory.sqm")}
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
                              render={
                                <Link href={`/stock/inventory/${product.id}`} />
                              }
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("stock.inventory.viewAria", {
                                name: product.name,
                              })}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <EditProductDialog
                              product={product}
                              onUpdated={reload}
                              trigger={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("stock.inventory.editAria", {
                                    name: product.name,
                                  })}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                            <DeleteProductButton
                              productId={product.id}
                              productName={product.name}
                              onDeleted={reload}
                              trigger={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  aria-label={t("stock.inventory.deleteAria", {
                                    name: product.name,
                                  })}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                            />
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

      {!loading && !error && totalResults > 0 && totalPages > 1 && (
        <footer className="mt-8 flex flex-col gap-4 text-sm text-[#53604d] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("stock.inventory.showingRange", {
              start: showingStart,
              end: showingEnd,
              total: totalResults.toLocaleString(),
            })}
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
                  <span className="hidden sm:inline">
                    {t("sales.newOrder.productStep.first")}
                  </span>
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
                  <span className="hidden sm:inline">
                    {t("sales.newOrder.productStep.last")}
                  </span>
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
