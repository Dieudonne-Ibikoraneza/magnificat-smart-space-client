"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  PackageOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ProductCard, type Product } from "@/components/product-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterGroups } from "@/data/catalog";
import {
  EMPTY_FILTERS,
  type CatalogFilters,
  filterProducts,
  getVisiblePages,
  hasActiveFilters,
  paginateProducts,
  sortLabels,
  sortProducts,
  toggleFilterOption,
  type SortOption,
} from "@/lib/catalog-utils";

export const FilterOptionsCard = ({
  bare = false,
  filters,
  onToggle,
  onReset,
}: {
  bare?: boolean;
  filters: CatalogFilters;
  onToggle: (group: keyof CatalogFilters, option: string) => void;
  onReset: () => void;
}) => (
  <section
    className={
      bare ? "bg-transparent p-0" : "rounded-2xl bg-white p-6 shadow-sm"
    }
  >
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-bold text-ink">Filters</h2>
      <Button
        type="button"
        variant="link"
        className="h-auto p-0 text-sm text-amber"
        onClick={onReset}
        disabled={!hasActiveFilters(filters)}
      >
        Reset
      </Button>
    </div>
    <Accordion
      multiple
      defaultValue={filterGroups.map((group) => group.title)}
    >
      {filterGroups.map((group) => (
        <AccordionItem key={group.title} value={group.title}>
          <AccordionTrigger className="cursor-pointer py-4 text-sm font-semibold text-ink hover:no-underline">
            {group.title}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2.5">
              {group.options.map((option) => {
                const checked = filters[group.title].includes(option);

                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 text-sm text-ink"
                  >
                    <span
                      className={`flex size-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary" : "border-slate-200"}`}
                    >
                      <Input
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        onChange={() => onToggle(group.title, option)}
                      />
                      <Check
                        className={`size-3.5 ${checked ? "text-ink" : "hidden"}`}
                      />
                    </span>
                    {option}
                  </label>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);

const AiHelpCard = () => (
  <section className="rounded-2xl bg-ink p-6 text-center text-white shadow-sm">
    <h3 className="mb-2 text-lg font-bold">Need Expert Help</h3>
    <p className="mb-5 text-sm leading-5 text-white/75">
      Chat with our AI interior designer to find the perfect match.
    </p>
    <Button className="h-12 min-h-12 w-full py-3 font-semibold text-ink bg-primary hover:bg-primary/90">
      Ask AI Assistant
    </Button>
  </section>
);

const CatalogEmptyState = ({
  isCollectionEmpty,
  onResetFilters,
}: {
  isCollectionEmpty: boolean;
  onResetFilters: () => void;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
    <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted-background text-muted">
      <PackageOpen className="size-7" />
    </div>
    <h3 className="text-lg font-bold text-ink">
      {isCollectionEmpty
        ? "No products in this collection yet"
        : "No products match your filters"}
    </h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
      {isCollectionEmpty
        ? "We're still adding tiles to this collection. Browse other collections or check back soon."
        : "Try removing some filters or reset them to see all available products."}
    </p>
    {!isCollectionEmpty && (
      <Button
        type="button"
        className="mt-6 h-11 px-6 font-semibold text-ink bg-primary hover:bg-primary/90"
        onClick={onResetFilters}
      >
        Reset filters
      </Button>
    )}
    {isCollectionEmpty && (
      <Button
        nativeButton={false}
        render={<Link href="/collections" />}
        className="mt-6 h-11 px-6 font-semibold text-ink bg-primary hover:bg-primary/90"
      >
        Browse collections
      </Button>
    )}
  </div>
);

const CatalogToolbar = ({
  showingStart,
  showingEnd,
  totalResults,
  viewMode,
  sortBy,
  onSortChange,
  onViewModeChange,
  onOpenFilters,
  searchOpen,
  searchVisible,
  onToggleSearch,
  searchQuery,
  onSearchChange,
}: {
  showingStart: number;
  showingEnd: number;
  totalResults: number;
  viewMode: "grid" | "list";
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onOpenFilters: () => void;
  searchOpen: boolean;
  searchVisible: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) => (
  <div
    className="relative mb-4 flex flex-col gap-3 overflow-hidden rounded-xl bg-white px-5 py-3 shadow-sm transition-[max-height] duration-300 ease-in-out"
    style={{
      maxHeight: searchVisible ? "320px" : "128px",
      transition: "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      willChange: "max-height",
    }}
  >
    <Button
      type="button"
      size="icon-lg"
      className="fixed right-6 bottom-6 z-40 size-14 rounded-full bg-primary text-ink shadow-lg hover:bg-primary/90 xl:hidden"
      onClick={onOpenFilters}
      aria-label="Open filters"
    >
      <SlidersHorizontal className="size-6" />
    </Button>
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted">
      {totalResults === 0 ? (
        "No results"
      ) : (
        <>
          Showing{" "}
          <strong className="text-ink">
            {showingStart}-{showingEnd}
          </strong>{" "}
          of <strong className="text-ink">{totalResults}</strong> results
        </>
      )}
    </p>
    <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>Sort by:</span>
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="h-9 w-40 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold hover:bg-muted-background data-[state=open]:border-border data-[state=open]:bg-white">
            <SelectValue>{(value) => sortLabels[value as SortOption]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="w-48 rounded-2xl border-slate-200 bg-white p-2 shadow-[0_14px_32px_rgba(15,39,71,0.16)] [&_[data-slot=select-item]]:mb-1">
            <SelectItem
              value="newest"
              className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
            >
              Newest Arrivals
            </SelectItem>
            <SelectItem
              value="low"
              className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
            >
              Price: Low to High
            </SelectItem>
            <SelectItem
              value="high"
              className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
            >
              Price: High to Low
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-muted-background p-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onViewModeChange("grid")}
            className={viewMode === "grid" ? "bg-white text-ink shadow-sm" : "text-muted"}
            aria-label="Grid view"
          >
            <LayoutGrid />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onViewModeChange("list")}
            className={viewMode === "list" ? "bg-white text-ink shadow-sm" : "text-muted"}
            aria-label="List view"
          >
            <List />
          </Button>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className={searchOpen ? "bg-muted-background text-ink" : "text-muted"}
          onClick={onToggleSearch}
          aria-label={searchOpen ? "Close product search" : "Search products"}
          aria-expanded={searchOpen}
        >
          {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
        </Button>
      </div>
    </div>
    </div>
    {searchVisible ? (
      <div className={searchOpen ? "animate-in slide-in-from-top-2 fade-in duration-200" : "animate-out slide-out-to-top-2 fade-out duration-200"}>
        <label htmlFor="catalog-search" className="sr-only">Search products</label>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <Input
            id="catalog-search"
            autoFocus
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search products by name or collection..."
            className="h-11 w-full rounded-full border-slate-200 bg-[#F9FAFB] pr-4 pl-11 text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>
    ) : null}
  </div>
);

const MobileFiltersSheet = ({
  open,
  closing,
  onClose,
  filters,
  onToggle,
  onReset,
}: {
  open: boolean;
  closing: boolean;
  onClose: () => void;
  filters: CatalogFilters;
  onToggle: (group: keyof CatalogFilters, option: string) => void;
  onReset: () => void;
}) => {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm xl:hidden ${closing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`scrollbar-hide absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-background px-5 shadow-2xl duration-300 ${closing ? "animate-out slide-out-to-bottom-full fade-out" : "animate-in slide-in-from-bottom-full fade-in"}`}
      >
        <div className="sticky top-0 z-10 -mx-5 mb-4 flex h-8 items-start justify-center bg-background pt-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="space-y-6 pb-8">
          <FilterOptionsCard
            bare
            filters={filters}
            onToggle={onToggle}
            onReset={onReset}
          />
          <Button
            type="button"
            variant="link"
            className="h-auto w-full justify-center p-0 text-sm text-amber"
            onClick={onClose}
          >
            Close filters
          </Button>
          <AiHelpCard />
        </div>
      </div>
    </div>
  );
};

export const ProductCatalog = ({
  products,
  breadcrumb,
  showFavorites = true,
  detailsBasePath = "/products",
}: {
  products: Product[];
  breadcrumb?: ReactNode;
  showFavorites?: boolean;
  detailsBasePath?: string;
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersClosing, setFiltersClosing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isCollectionEmpty = products.length === 0;

  const processedProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchedProducts = products.filter((product) =>
      normalizedSearch === "" ||
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.collection.toLowerCase().includes(normalizedSearch) ||
      product.collectionId.toLowerCase().includes(normalizedSearch),
    );
    const filtered = filterProducts(searchedProducts, filters);
    return sortProducts(filtered, sortBy);
  }, [products, filters, searchQuery, sortBy]);

  const pagination = useMemo(
    () => paginateProducts(processedProducts, currentPage),
    [processedProducts, currentPage],
  );

  const visiblePages = useMemo(
    () => getVisiblePages(pagination.currentPage, pagination.totalPages),
    [pagination.currentPage, pagination.totalPages],
  );

  const handleToggleFilter = (
    group: keyof CatalogFilters,
    option: string,
  ) => {
    setFilters((current) => toggleFilterOption(current, group, option));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), pagination.totalPages));
  };

  const openFilters = () => {
    setFiltersClosing(false);
    setFiltersOpen(true);
  };

  const closeFilters = () => {
    setFiltersClosing(true);
    window.setTimeout(() => {
      setFiltersOpen(false);
      setFiltersClosing(false);
    }, 300);
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      window.setTimeout(() => setSearchVisible(false), 200);
      return;
    }

    setSearchVisible(true);
    window.requestAnimationFrame(() => setSearchOpen(true));
  };

  return (
    <>
      <MobileFiltersSheet
        open={filtersOpen}
        closing={filtersClosing}
        onClose={closeFilters}
        filters={filters}
        onToggle={handleToggleFilter}
        onReset={handleResetFilters}
      />

      <div>
        {breadcrumb && <div className="mb-6">{breadcrumb}</div>}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="scrollbar-hide hidden w-72 shrink-0 space-y-6 xl:sticky xl:top-6 xl:block xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
            <FilterOptionsCard
              filters={filters}
              onToggle={handleToggleFilter}
              onReset={handleResetFilters}
            />
            <AiHelpCard />
          </aside>

          <section className="min-w-0 flex-1">
            <CatalogToolbar
              showingStart={pagination.showingStart}
              showingEnd={pagination.showingEnd}
              totalResults={pagination.totalResults}
              viewMode={viewMode}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              onViewModeChange={setViewMode}
              onOpenFilters={openFilters}
              searchOpen={searchOpen}
              searchVisible={searchVisible}
              onToggleSearch={toggleSearch}
              searchQuery={searchQuery}
              onSearchChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
            />

            {pagination.items.length === 0 ? (
              <CatalogEmptyState
                isCollectionEmpty={isCollectionEmpty}
                onResetFilters={handleResetFilters}
              />
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid gap-4"
                }
              >
                {pagination.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    list={viewMode === "list"}
                    showFavorite={showFavorites}
                    detailsBasePath={detailsBasePath}
                  />
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <Pagination className="py-6">
                <PaginationContent className="gap-1 sm:gap-2">
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="sm"
                      className="gap-1 text-ink hover:text-amber"
                      aria-disabled={pagination.currentPage === 1}
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
                      className="text-ink hover:text-amber"
                      aria-disabled={pagination.currentPage === 1}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(pagination.currentPage - 1);
                      }}
                    />
                  </PaginationItem>
                  {visiblePages.map((page, index) =>
                    page === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={pagination.currentPage === page}
                          size="icon-sm"
                          className={
                            pagination.currentPage === page
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
                      className="text-ink hover:text-amber"
                      aria-disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(pagination.currentPage + 1);
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="sm"
                      className="gap-1 text-ink hover:text-amber"
                      aria-disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(pagination.totalPages);
                      }}
                    >
                      <span className="hidden sm:inline">Last</span>
                      <ChevronsRight className="size-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </section>
        </div>
      </div>
    </>
  );
};
