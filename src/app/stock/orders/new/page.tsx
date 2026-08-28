"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Calculator,
  Check,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Contact,
  Layers3,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { StockDetailHeader } from "@/app/stock/layout";
import { FilterOptionsCard } from "@/components/product-catalog";
import { StockNegotiationChat } from "@/components/stock-negotiation-chat";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { salesCustomers, type SalesCustomer } from "@/data/sales-customers";
import type { Product } from "@/components/product-card";
import { InventoryProductCard } from "@/app/stock/inventory/page";
import { inventoryProducts } from "@/data/inventory";
import { calculateTileQuantity } from "@/lib/tile-calculator";
import {
  EMPTY_FILTERS,
  filterProducts,
  getVisiblePages,
  hasActiveFilters,
  paginateProducts,
  sortLabels,
  sortProducts,
  toggleFilterOption,
  type CatalogFilters,
  type SortOption,
} from "@/lib/catalog-utils";
import { getStockShortage, type StockShortage } from "@/lib/stock-availability";
import { cn } from "@/lib/utils";

const isPositiveNumber = (value: string) => value.trim() !== "" && Number(value) > 0;
const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

type CustomerSort = "newest" | "name";

const customerSortLabels: Record<CustomerSort, string> = {
  newest: "Joined: Newest",
  name: "Name: A - Z",
};

const steps = [
  { id: 1, label: "Customer", icon: User },
  { id: 2, label: "Products", icon: Package },
  { id: 3, label: "Review & Create", icon: ClipboardCheck },
] as const;

const stepAccent = {
  1: { bg: "bg-blue-500", ring: "ring-blue-200", text: "text-blue-600" },
  2: { bg: "bg-violet-500", ring: "ring-violet-200", text: "text-violet-600" },
  3: { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-600" },
} as const;

const segmentGradient = [
  "bg-gradient-to-r from-blue-500 to-violet-500",
  "bg-gradient-to-r from-violet-500 to-emerald-500",
];

const OrderStepper = ({
  step,
  maxReachedStep,
  onStepClick,
}: {
  step: number;
  maxReachedStep: number;
  onStepClick: (id: number) => void;
}) => (
  <div className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex items-center">
      {steps.map((item, index) => {
        const accent = stepAccent[item.id];
        const isDone = item.id < step;
        const isCurrent = item.id === step;
        const isReachable = item.id <= maxReachedStep;
        const Icon = item.icon;

        return (
          <Fragment key={item.id}>
            {index > 0 && (
              <div
                className={cn(
                  "mx-2 h-1 flex-1 rounded-full transition-colors sm:mx-4",
                  item.id <= maxReachedStep ? segmentGradient[index - 1] : "bg-border",
                )}
              />
            )}
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => onStepClick(item.id)}
              className={cn(
                "group flex shrink-0 flex-col items-center gap-2",
                isReachable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-white shadow-sm ring-4 transition-all sm:size-12",
                  isDone || isCurrent ? accent.bg : "bg-secondary text-muted-foreground",
                  isCurrent ? accent.ring : "ring-transparent",
                )}
              >
                {isDone ? <Check className="size-5" strokeWidth={3} /> : <Icon className="size-5" strokeWidth={2} />}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-bold tracking-wide uppercase sm:block",
                  isCurrent ? accent.text : isDone ? "text-ink" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  </div>
);

/** Search + sort + filters-toggle toolbar, styled after the public catalog's CatalogToolbar. */
/** "Filters" trigger with its panel floating below it as a popover, instead of pushing page content down. */
const FILTERS_MENU_ANIMATION_MS = 150;

const FiltersMenu = ({
  open,
  onToggle,
  onClose,
  active,
  panel,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  active: boolean;
  panel: ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, FILTERS_MENU_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant={open ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        aria-expanded={open}
        className={cn("relative h-9 gap-2 px-3 text-sm font-semibold", open && "bg-primary text-ink hover:bg-primary/90")}
      >
        <SlidersHorizontal className="size-4" />
        Filters
        {active && !open && <span className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-primary ring-2 ring-card" />}
      </Button>
      {mounted && (
        <div
          className={cn(
            "scrollbar-hide absolute top-full right-0 z-30 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] origin-top-right overflow-y-auto rounded-2xl shadow-xl ring-1 ring-ink/10 duration-150",
            closing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-1" : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1",
          )}
        >
          {panel}
        </div>
      )}
    </div>
  );
};

const StepToolbar = ({
  showingCount,
  totalCount,
  resultsNoun = "results",
  sortValue,
  sortOptions,
  onSortChange,
  filtersOpen,
  onToggleFilters,
  onCloseFilters,
  filtersActive,
  filtersPanel,
  searchOpen,
  searchVisible,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: {
  showingCount: number;
  totalCount: number;
  resultsNoun?: string;
  sortValue: string;
  sortOptions: { value: string; label: string }[];
  onSortChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onCloseFilters: () => void;
  filtersActive: boolean;
  filtersPanel: ReactNode;
  searchOpen: boolean;
  searchVisible: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}) => (
  <div className="relative mb-5 flex flex-col gap-3 rounded-xl bg-card px-5 py-3 shadow-sm">
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing <strong className="text-ink">{showingCount}</strong> of <strong className="text-ink">{totalCount}</strong> {resultsNoun}
          </>
        )}
      </p>
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Sort by:</span>
          <Select value={sortValue} onValueChange={(value) => onSortChange(value ?? sortOptions[0].value)}>
            <SelectTrigger className="h-9 w-auto min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold hover:bg-secondary data-[state=open]:border-border data-[state=open]:bg-card">
              <SelectValue>{(value) => sortOptions.find((option) => option.value === value)?.label ?? sortOptions[0].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <FiltersMenu open={filtersOpen} onToggle={onToggleFilters} onClose={onCloseFilters} active={filtersActive} panel={filtersPanel} />
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={searchOpen ? "bg-secondary text-ink" : "text-muted-foreground"}
            onClick={onToggleSearch}
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </Button>
        </div>
      </div>
    </div>
    {searchVisible ? (
      <div className={searchOpen ? "animate-in slide-in-from-top-2 fade-in duration-200" : "animate-out slide-out-to-top-2 fade-out duration-200"}>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-full border-slate-200 bg-[#F9FAFB] pr-4 pl-11 text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>
    ) : null}
  </div>
);

/** Search-icon toggle with the same open/close/hide timing as the public catalog's toolbar. */
const useSearchToggle = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      window.setTimeout(() => setSearchVisible(false), 200);
      return;
    }
    setSearchVisible(true);
    window.requestAnimationFrame(() => setSearchOpen(true));
  };

  return { searchOpen, searchVisible, toggleSearch };
};

const customerStatusOptions = ["Active", "Inactive"] as const;

const CustomerFiltersCard = ({
  status,
  onToggle,
  onReset,
}: {
  status: string[];
  onToggle: (option: string) => void;
  onReset: () => void;
}) => (
  <section className="rounded-2xl bg-white p-6 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-bold text-ink">Filters</h2>
      <Button type="button" variant="link" className="h-auto p-0 text-sm text-amber" onClick={onReset} disabled={status.length === 0}>
        Reset
      </Button>
    </div>
    <Accordion multiple defaultValue={["Status"]}>
      <AccordionItem value="Status">
        <AccordionTrigger className="cursor-pointer py-4 text-sm font-semibold text-ink hover:no-underline">Status</AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="space-y-2.5">
            {customerStatusOptions.map((option) => {
              const checked = status.includes(option);
              return (
                <label key={option} className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded border",
                      checked ? "border-primary bg-primary" : "border-slate-200",
                    )}
                  >
                    <Input type="checkbox" className="peer sr-only" checked={checked} onChange={() => onToggle(option)} />
                    <Check className={cn("size-3.5", checked ? "text-ink" : "hidden")} />
                  </span>
                  {option}
                </label>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </section>
);

const customerSortOptions = [
  { value: "newest", label: customerSortLabels.newest },
  { value: "name", label: customerSortLabels.name },
];

const CustomerStep = ({
  selectedSlug,
  onSelect,
}: {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [sort, setSort] = useState<CustomerSort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { searchOpen, searchVisible, toggleSearch } = useSearchToggle();

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const results = salesCustomers.filter(
      (customer) =>
        (status.length === 0 || status.includes(customer.status)) &&
        (normalizedQuery === "" ||
          customer.name.toLowerCase().includes(normalizedQuery) ||
          customer.email.toLowerCase().includes(normalizedQuery)),
    );
    return sort === "name" ? [...results].sort((a, b) => a.name.localeCompare(b.name)) : results;
  }, [query, status, sort]);

  return (
    <>
      <StepToolbar
        showingCount={filtered.length}
        totalCount={salesCustomers.length}
        resultsNoun="customers"
        sortValue={sort}
        sortOptions={customerSortOptions}
        onSortChange={(value) => setSort(value as CustomerSort)}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onCloseFilters={() => setFiltersOpen(false)}
        filtersActive={status.length > 0}
        filtersPanel={
          <CustomerFiltersCard
            status={status}
            onToggle={(option) => setStatus((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]))}
            onReset={() => setStatus([])}
          />
        }
        searchOpen={searchOpen}
        searchVisible={searchVisible}
        onToggleSearch={toggleSearch}
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by customer name, email..."
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">No customers match your filters.</p>
      ) : (
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((customer) => {
            const selected = customer.slug === selectedSlug;
            return (
              <li key={customer.slug}>
                <button
                  type="button"
                  onClick={() => onSelect(customer.slug)}
                  className={cn(
                    "group flex w-full flex-col rounded-2xl border-2 bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6",
                    selected ? "border-primary shadow-md" : "border-transparent",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate text-xl font-bold text-ink">{customer.name}</h2>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={customer.status === "Active" ? "primary" : "warning"}>{customer.status}</Badge>
                      {selected && (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-ink">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 font-data text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">Contact</dt>
                      <dd className="min-w-0 text-right text-ink">
                        <span className="block truncate">{customer.email}</span>
                        <span className="block whitespace-nowrap">{customer.phone}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Last Order</dt>
                      <dd className="whitespace-nowrap text-ink">{customer.lastOrder}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                      <dt className="text-muted-foreground">Total Spend</dt>
                      <dd className="text-xl font-semibold whitespace-nowrap text-ink">{customer.totalSpend}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

/** Compact live tile-quantity calculator shown under a selected product card. */
const AreaCalculatorCard = ({
  product,
  value,
  onChange,
  shortage,
}: {
  product: Product;
  value: string;
  onChange: (value: string) => void;
  shortage?: StockShortage | null;
}) => {
  const valid = isPositiveNumber(value);
  const calc = valid ? calculateTileQuantity(Number(value), product) : null;

  return (
    <div
      className="mt-3 overflow-hidden rounded-xl border border-primary/40 bg-primary/10"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-primary/20 px-4 py-2.5">
        <Calculator className="size-4 text-ink" strokeWidth={2} />
        <span className="text-xs font-bold tracking-wide text-ink uppercase">Required Area</span>
      </div>
      <div className="p-4">
        <div className="relative">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-12 rounded-lg border-none bg-white pr-14 text-lg font-bold text-ink shadow-sm"
          />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted-foreground">m²</span>
        </div>
        {calc ? (
          <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Boxes className="size-3.5" strokeWidth={2.25} />
              {calc.completeBoxes} boxes
            </span>
            {calc.remainingPieces > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers3 className="size-3.5" strokeWidth={2.25} />+{calc.remainingPieces} pcs
              </span>
            )}
            <span className="ml-auto text-muted-foreground">{calc.totalPieces} pcs total</span>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Enter the area to calculate boxes &amp; pieces.</p>
        )}
        {shortage && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Only {shortage.availableSqm > 0 ? `${shortage.availableSqm} sqm` : "none"} available — the stock negotiation chat has been opened below.
          </p>
        )}
      </div>
    </div>
  );
};

const productSortOptions = [
  { value: "newest", label: sortLabels.newest },
  { value: "low", label: sortLabels.low },
  { value: "high", label: sortLabels.high },
];

const ProductStep = ({
  selectedProducts,
  onToggle,
  onAreaChange,
  shortages,
}: {
  selectedProducts: Record<string, string>;
  onToggle: (id: string) => void;
  onAreaChange: (id: string, value: string) => void;
  shortages: StockShortage[];
}) => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { searchOpen, searchVisible, toggleSearch } = useSearchToggle();

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = inventoryProducts.filter(
      (product) =>
        q === "" ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.collection.toLowerCase().includes(q),
    );
    return sortProducts(filterProducts(searched, filters), sort);
  }, [query, filters, sort]);

  const pagination = useMemo(() => paginateProducts(processed, currentPage), [processed, currentPage]);
  const visiblePages = useMemo(() => getVisiblePages(pagination.currentPage, pagination.totalPages), [pagination.currentPage, pagination.totalPages]);

  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), pagination.totalPages));

  return (
    <>
      <StepToolbar
        showingCount={pagination.items.length}
        totalCount={pagination.totalResults}
        sortValue={sort}
        sortOptions={productSortOptions}
        onSortChange={(value) => {
          setSort(value as SortOption);
          setCurrentPage(1);
        }}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onCloseFilters={() => setFiltersOpen(false)}
        filtersActive={hasActiveFilters(filters)}
        searchOpen={searchOpen}
        searchVisible={searchVisible}
        onToggleSearch={toggleSearch}
        searchQuery={query}
        onSearchChange={(value) => {
          setQuery(value);
          setCurrentPage(1);
        }}
        filtersPanel={
          <FilterOptionsCard
            filters={filters}
            onToggle={(group, option) => {
              setFilters((current) => toggleFilterOption(current, group, option));
              setCurrentPage(1);
            }}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setCurrentPage(1);
            }}
          />
        }
        searchPlaceholder="Search products, SKUs..."
      />

      {pagination.items.length === 0 ? (
        <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">No products match your filters.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pagination.items.map((product) => {
            const selected = product.id in selectedProducts;
            return (
              <div key={product.id}>
                <InventoryProductCard
                  product={product as (typeof inventoryProducts)[number]}
                  selectable
                  selected={selected}
                  onToggle={() => onToggle(product.id)}
                />
                {selected && (
                  <AreaCalculatorCard
                    product={product}
                    value={selectedProducts[product.id] ?? ""}
                    onChange={(value) => onAreaChange(product.id, value)}
                    shortage={shortages.find((shortage) => shortage.productId === product.id)}
                  />
                )}
              </div>
            );
          })}
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
                aria-disabled={pagination.currentPage === pagination.totalPages}
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
                aria-disabled={pagination.currentPage === pagination.totalPages}
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
    </>
  );
};

type OrderLine = { product: Product; area: number; boxes: number; additionalPieces: number; pieces: number; lineTotal: number };

const ReviewStep = ({ customer, items, grandTotal }: { customer: SalesCustomer; items: OrderLine[]; grandTotal: number }) => (
  <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
    <section className="overflow-hidden rounded-2xl bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-ink sm:text-2xl">Order Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review the quantities and pricing before creating the order.</p>
        </div>
        <Badge variant="secondary">{items.length} Items</Badge>
      </div>

      <div className="md:hidden">
        <ul className="divide-y divide-[#E8E8E8]">
          {items.map(({ product, area, boxes, additionalPieces, pieces, lineTotal }) => (
            <li key={product.id} className="px-5 py-4 font-data">
              <div className="flex items-center gap-3 font-semibold text-ink uppercase">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-muted-background">
                  <Image src={product.image} alt="" fill unoptimized className="object-cover" />
                </div>
                <span>{product.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {area} sqm • {boxes} boxes{additionalPieces > 0 ? ` + ${additionalPieces} pcs` : ""} ({pieces} pcs) • {formatRWF(product.price)}
                </span>
                <span className="font-semibold text-ink">{formatRWF(lineTotal)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(({ product, area, boxes, additionalPieces, pieces, lineTotal }) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium text-ink uppercase">
                  <div className="flex items-center gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-muted-background">
                      <Image src={product.image} alt="" fill unoptimized className="object-cover" />
                    </div>
                    <span>{product.name}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-ink">
                  <span className="block">{area} sqm</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {boxes} boxes{additionalPieces > 0 ? ` + ${additionalPieces} pcs` : ""} ({pieces} pcs)
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatRWF(product.price)}</TableCell>
                <TableCell className="whitespace-nowrap font-semibold text-ink">{formatRWF(lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 bg-primary px-5 py-6 sm:justify-end sm:px-10">
        <span className="font-data text-lg font-semibold text-primary-foreground sm:text-2xl">Total</span>
        <span className="font-data text-xl font-bold text-primary-foreground sm:text-3xl">{formatRWF(grandTotal)}</span>
      </div>
    </section>

    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
          <Contact className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-ink sm:text-xl">Customer Info</h2>
      </div>
      <dl className="mt-5 space-y-5 text-sm">
        <div>
          <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Company</dt>
          <dd className="mt-1 font-medium text-ink">{customer.name}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Contact Person</dt>
          <dd className="mt-2 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
              {customer.contactName.split(" ").map((part) => part[0]).join("")}
            </span>
            <span className="text-ink">{customer.contactName}</span>
          </dd>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Email</dt>
            <dd className="truncate text-ink">{customer.email}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Phone</dt>
            <dd className="text-ink">{customer.phone}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Delivery Address</dt>
            <dd className="text-ink">
              {customer.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  </div>
);

const CreateOrderWizard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("customer");
  const hasValidPreselection = salesCustomers.some((customer) => customer.slug === preselectedSlug);

  const [step, setStep] = useState(hasValidPreselection ? 2 : 1);
  const [maxReachedStep, setMaxReachedStep] = useState(hasValidPreselection ? 2 : 1);
  const [selectedCustomerSlug, setSelectedCustomerSlug] = useState<string | null>(
    hasValidPreselection ? preselectedSlug : null,
  );
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedCustomer = salesCustomers.find((customer) => customer.slug === selectedCustomerSlug) ?? null;
  const selectedProductIds = Object.keys(selectedProducts);
  const allAreasValid = selectedProductIds.length > 0 && selectedProductIds.every((id) => isPositiveNumber(selectedProducts[id]));

  const shortages: StockShortage[] = useMemo(
    () =>
      selectedProductIds
        .map((id) => {
          const product = inventoryProducts.find((item) => item.id === id);
          const area = Number(selectedProducts[id]);
          return product && isPositiveNumber(selectedProducts[id]) ? getStockShortage(product, area) : null;
        })
        .filter((shortage): shortage is StockShortage => shortage !== null),
    [selectedProductIds, selectedProducts],
  );

  const orderItems: OrderLine[] = useMemo(() => {
    if (step !== 3 || !allAreasValid) return [];
    return selectedProductIds.map((id) => {
      const product = inventoryProducts.find((item) => item.id === id) as Product;
      const area = Number(selectedProducts[id]);
      const calc = calculateTileQuantity(area, product);
      return {
        product,
        area,
        boxes: calc.completeBoxes,
        additionalPieces: calc.remainingPieces,
        pieces: calc.totalPieces,
        lineTotal: product.price * area,
      };
    });
  }, [step, allAreasValid, selectedProductIds, selectedProducts]);

  const grandTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const goNext = () => {
    const next = Math.min(3, step + 1);
    setStep(next);
    setMaxReachedStep((current) => Math.max(current, next));
  };

  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const toggleProduct = (id: string) => {
    setSelectedProducts((current) => {
      if (id in current) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: "" };
    });
  };

  const setProductArea = (id: string, value: string) => {
    setSelectedProducts((current) => ({ ...current, [id]: value }));
  };

  const handleCreateOrder = () => {
    if (!selectedCustomer || !allAreasValid) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Order created", {
        description: `${orderItems.length} product${orderItems.length === 1 ? "" : "s"} for ${selectedCustomer.name} · ${formatRWF(grandTotal)}`,
      });
      router.push("/stock/orders");
    }, 700);
  };

  const canGoNext = step === 1 ? selectedCustomerSlug !== null : step === 2 ? allAreasValid : false;

  return (
    <>
      <StockDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/stock/overview" },
          { label: "Orders", href: "/stock/orders" },
          { label: "New Order" },
        ]}
        title="Create New Order"
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/stock/orders")} className="h-11 px-5 text-sm font-bold">
            Cancel
          </Button>
        }
      />

      <div className="space-y-5 sm:space-y-6">
        <OrderStepper step={step} maxReachedStep={maxReachedStep} onStepClick={setStep} />

        {step === 1 && <CustomerStep selectedSlug={selectedCustomerSlug} onSelect={setSelectedCustomerSlug} />}
        {step === 2 && (
          <ProductStep selectedProducts={selectedProducts} onToggle={toggleProduct} onAreaChange={setProductArea} shortages={shortages} />
        )}
        {step === 3 && selectedCustomer && <ReviewStep customer={selectedCustomer} items={orderItems} grandTotal={grandTotal} />}

        <div className="flex items-center justify-between gap-3 pb-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1}
            onClick={goBack}
            className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button type="button" disabled={!canGoNext} onClick={goNext} className="h-12 px-6 text-sm font-bold disabled:opacity-60">
              Next
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting || !allAreasValid}
              onClick={handleCreateOrder}
              className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-60"
            >
              <Save className="size-4" />
              {submitting ? "Creating..." : "Create Order"}
            </Button>
          )}
        </div>
      </div>

      <StockNegotiationChat shortages={shortages} />
    </>
  );
};

const NewOrderPage = () => (
  <Suspense fallback={null}>
    <CreateOrderWizard />
  </Suspense>
);

export default NewOrderPage;
