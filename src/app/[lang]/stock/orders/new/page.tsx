"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
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
  Package,
  Phone,
  Save,
  Search,
  User,
  X,
} from "lucide-react";
import { StockDetailHeader } from "@/app/[lang]/stock/layout";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { SelectableProductCard } from "@/components/selectable-product-card";
import {
  Badge,
} from "@/components/ui/badge";
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
import { ordersApi, productsApi, usersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { ApiProduct, CustomerSummary, StockStatus, SuitableFor, UserStatus } from "@/lib/api/types";
import { calculateTileQuantity } from "@/lib/tile-calculator";
import { getVisiblePages, type SortOption } from "@/lib/catalog-utils";
import { clearOrderDraft, readOrderDraft, writeOrderDraft } from "@/lib/order-draft-storage";
import { formatCompactCurrency, formatRelativeTime, cn } from "@/lib/utils";

const PRODUCT_PAGE_SIZE = 6;

/** Distinct per role so a stock manager's draft never collides with a sales person's on the same browser. */
const ORDER_DRAFT_KEY = "mss.order-draft.stock";

/** Stock managers and admins can adjust stock themselves; sales people can't — see `products.controller.ts` roles. */
const CAN_ADJUST_STOCK = true;

const isPositiveNumber = (value: string) => value.trim() !== "" && Number(value) > 0;
const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const tilePackagingOf = (product: ApiProduct) => ({
  tileArea: product.tileAreaSqm,
  boxCoverage: Number(product.boxCoverageSqm),
  piecesPerBox: product.piecesPerBox,
});

const availableStockOf = (product: ApiProduct) => product.quantityOnHandSqm ?? 0;

type CustomerSort = "newest" | "name";

const customerStatusBadge: Record<UserStatus, "primary" | "muted" | "destructive"> = {
  ACTIVE: "primary",
  INACTIVE: "muted",
  SUSPENDED: "destructive",
};

const steps = [
  { id: 1, labelKey: "sales.newOrder.steps.customer", icon: User },
  { id: 2, labelKey: "sales.newOrder.steps.products", icon: Package },
  { id: 3, labelKey: "sales.newOrder.steps.review", icon: ClipboardCheck },
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
}) => {
  const { t } = useTranslation();

  return (
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
                {t(item.labelKey)}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  </div>
  );
};

/** Search + sort toolbar, styled after the public catalog's CatalogToolbar. Filters for each step are simple pills/selects rendered just below it. */
const StepToolbar = ({
  showingCount,
  totalCount,
  resultsNoun,
  sortValue,
  sortOptions,
  onSortChange,
  searchOpen,
  searchVisible,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: {
  showingCount: number;
  totalCount: number;
  resultsNoun: string;
  sortValue: string;
  sortOptions: { value: string; label: string }[];
  onSortChange: (value: string) => void;
  searchOpen: boolean;
  searchVisible: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}) => {
  const { t } = useTranslation();

  return (
  <div className="relative mb-5 flex flex-col gap-3 rounded-xl bg-card px-5 py-3 shadow-sm">
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          t("sales.newOrder.toolbar.noResults")
        ) : (
          <>
            {t("sales.newOrder.toolbar.showing")} <strong className="text-ink">{showingCount}</strong> {t("sales.newOrder.toolbar.of")} <strong className="text-ink">{totalCount}</strong> {resultsNoun}
          </>
        )}
      </p>
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{t("sales.newOrder.toolbar.sortBy")}</span>
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
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={searchOpen ? "bg-secondary text-ink" : "text-muted-foreground"}
            onClick={onToggleSearch}
            aria-label={searchOpen ? t("sales.newOrder.toolbar.closeSearch") : t("sales.newOrder.toolbar.search")}
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
};

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

const CustomerStep = ({
  customers,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
}: {
  customers: CustomerSummary[];
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [sort, setSort] = useState<CustomerSort>("newest");
  const { searchOpen, searchVisible, toggleSearch } = useSearchToggle();

  const customerSortOptions = [
    { value: "newest", label: t("sales.newOrder.customerStep.joinedNewest") },
    { value: "name", label: t("sales.newOrder.customerStep.nameAZ") },
  ];

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const results = customers.filter(
      (customer) =>
        (status === "all" || customer.status === status) &&
        (normalizedQuery === "" ||
          customer.fullName.toLowerCase().includes(normalizedQuery) ||
          (customer.email ?? "").toLowerCase().includes(normalizedQuery)),
    );
    return sort === "name" ? [...results].sort((a, b) => a.fullName.localeCompare(b.fullName)) : results;
  }, [customers, query, status, sort]);

  if (loading) return <ApiLoading label={t("sales.newOrder.customerStep.loading")} className="py-24" />;
  if (error) return <ApiErrorState message={error} onRetry={onRetry} className="my-16" />;

  return (
    <>
      <StepToolbar
        showingCount={filtered.length}
        totalCount={customers.length}
        resultsNoun={t("sales.newOrder.resultsNoun.customers")}
        sortValue={sort}
        sortOptions={customerSortOptions}
        onSortChange={(value) => setSort(value as CustomerSort)}
        searchOpen={searchOpen}
        searchVisible={searchVisible}
        onToggleSearch={toggleSearch}
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder={t("sales.newOrder.customerStep.searchPlaceholder")}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "ACTIVE", "INACTIVE"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
              status === option ? "bg-primary text-ink" : "bg-card text-muted-foreground hover:bg-secondary",
            )}
          >
            {option === "all"
              ? t("sales.newOrder.customerStep.filterAll")
              : option === "ACTIVE"
                ? t("sales.newOrder.customerStep.filterActive")
                : t("sales.newOrder.customerStep.filterInactive")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <ApiEmptyState message={t("sales.newOrder.customerStep.noResults")} className="py-16" />
      ) : (
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((customer) => {
            const selected = customer.id === selectedId;
            return (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onSelect(customer.id)}
                  className={cn(
                    "group flex w-full flex-col rounded-2xl border-2 bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6",
                    selected ? "border-primary shadow-md" : "border-transparent",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate text-xl font-bold text-ink">{customer.fullName}</h2>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={customerStatusBadge[customer.status]}>{t(`staff.userStatus.${customer.status}`)}</Badge>
                      {selected && (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-ink">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 font-data text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{t("sales.newOrder.customerStep.contact")}</dt>
                      <dd className="min-w-0 text-right text-ink">
                        <span className="block truncate">{customer.email ?? "—"}</span>
                        <span className="block whitespace-nowrap">{customer.phone ?? "—"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t("sales.newOrder.customerStep.lastOrder")}</dt>
                      <dd className="whitespace-nowrap text-ink">
                        {customer.lastOrderAt ? formatRelativeTime(customer.lastOrderAt, t) : t("sales.newOrder.customerStep.noOrdersYet")}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                      <dt className="text-muted-foreground">{t("sales.newOrder.customerStep.totalSpend")}</dt>
                      <dd className="text-xl font-semibold whitespace-nowrap text-ink">
                        {formatCompactCurrency(customer.lifetimeSpend)}
                      </dd>
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

/** Compact live tile-quantity calculator shown under a selected product card, capped to what's actually on hand. */
const AreaCalculatorCard = ({
  product,
  value,
  onChange,
  onStockAdjusted,
}: {
  product: ApiProduct;
  value: string;
  onChange: (value: string) => void;
  onStockAdjusted: () => void;
}) => {
  const { t } = useTranslation();
  const available = availableStockOf(product);
  const valid = isPositiveNumber(value);
  const requested = valid ? Number(value) : 0;
  const exceedsStock = valid && requested > available;
  const calc = valid && !exceedsStock ? calculateTileQuantity(requested, tilePackagingOf(product)) : null;

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-xl border bg-primary/10",
        exceedsStock ? "border-red-300 bg-red-50" : "border-primary/40",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={cn("flex items-center gap-2 border-b px-4 py-2.5", exceedsStock ? "border-red-200" : "border-primary/20")}>
        <Calculator className="size-4 text-ink" strokeWidth={2} />
        <span className="text-xs font-bold tracking-wide text-ink uppercase">{t("sales.newOrder.calculator.requiredArea")}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{t("sales.newOrder.calculator.inStock", { value: available.toLocaleString() })}</span>
      </div>
      <div className="p-4">
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={available > 0 ? available : undefined}
            placeholder="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
              "h-12 rounded-lg border-none bg-white pr-14 text-lg font-bold text-ink shadow-sm",
              exceedsStock && "ring-2 ring-red-400",
            )}
          />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted-foreground">m²</span>
        </div>
        {calc ? (
          <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Boxes className="size-3.5" strokeWidth={2.25} />
              {t("sales.newOrder.calculator.boxes", { count: calc.completeBoxes })}
            </span>
            {calc.remainingPieces > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers3 className="size-3.5" strokeWidth={2.25} />{t("sales.newOrder.calculator.extraPieces", { count: calc.remainingPieces })}
              </span>
            )}
            <span className="ml-auto text-muted-foreground">{t("sales.newOrder.calculator.totalPieces", { count: calc.totalPieces })}</span>
          </div>
        ) : !exceedsStock ? (
          <p className="mt-3 text-xs text-muted-foreground">{t("sales.newOrder.calculator.prompt")}</p>
        ) : null}
        {exceedsStock && (
          <div className="mt-3 space-y-2.5">
            <p className="flex items-start gap-2 rounded-lg bg-red-100 px-3 py-2.5 text-xs font-medium text-red-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {available > 0
                ? t("sales.newOrder.calculator.exceedsSome", {
                    available: t("sales.newOrder.calculator.availableSqm", { value: available.toLocaleString() }),
                  })
                : t("sales.newOrder.calculator.exceedsNone")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {available > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => onChange(String(available))} className="h-8 text-xs font-bold">
                  {t("sales.newOrder.calculator.useMax")}
                </Button>
              )}
              {CAN_ADJUST_STOCK && (
                <AdjustStockDialog
                  productId={product.id}
                  productName={product.name}
                  currentStockSqm={available}
                  onAdjusted={onStockAdjusted}
                  renderTrigger={<Button type="button" variant="outline" size="sm" className="h-8 text-xs font-bold" />}
                  triggerContent={t("sales.newOrder.calculator.adjustStock")}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PRODUCT_SORT_KEYS: Record<SortOption, string> = {
  newest: "catalog.sort.newest",
  low: "catalog.sort.low",
  high: "catalog.sort.high",
};

const SUITABLE_FOR_KEYS: Record<"all" | SuitableFor, string> = {
  all: "sales.newOrder.productStep.suitableForAll",
  FLOOR: "sales.newOrder.productStep.suitableFloor",
  WALL: "sales.newOrder.productStep.suitableWall",
  BOTH: "sales.newOrder.productStep.suitableBoth",
};

const STOCK_STATUS_OPTION_KEYS: Record<"all" | StockStatus, string> = {
  all: "sales.newOrder.productStep.statusAll",
  in_stock: "staff.stockStatus.in_stock",
  low_stock: "staff.stockStatus.low_stock",
  out_of_stock: "staff.stockStatus.out_of_stock",
};

const SUITABLE_FOR_VALUES: ("all" | SuitableFor)[] = ["all", "FLOOR", "WALL", "BOTH"];
const STOCK_STATUS_VALUES: ("all" | StockStatus)[] = ["all", "in_stock", "low_stock", "out_of_stock"];

const ProductStep = ({
  products,
  loading,
  error,
  onRetry,
  selectedProducts,
  onToggle,
  onAreaChange,
  onStockAdjusted,
}: {
  products: ApiProduct[];
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
  selectedProducts: Record<string, string>;
  onToggle: (id: string) => void;
  onAreaChange: (id: string, value: string) => void;
  onStockAdjusted: () => void;
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [suitableFor, setSuitableFor] = useState<"all" | SuitableFor>("all");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { searchOpen, searchVisible, toggleSearch } = useSearchToggle();

  const productSortOptions = (["newest", "low", "high"] as SortOption[]).map((value) => ({
    value,
    label: t(PRODUCT_SORT_KEYS[value]),
  }));

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (product) =>
        (q === "" || product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)) &&
        (suitableFor === "all" || product.suitableFor === suitableFor) &&
        (status === "all" || product.stockStatus === status),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "low") return Number(a.price) - Number(b.price);
      if (sort === "high") return Number(b.price) - Number(a.price);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [products, query, suitableFor, status, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PRODUCT_PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = useMemo(
    () => processed.slice((safePage - 1) * PRODUCT_PAGE_SIZE, safePage * PRODUCT_PAGE_SIZE),
    [processed, safePage],
  );
  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);

  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  if (loading) return <ApiLoading label={t("sales.newOrder.productStep.loading")} className="py-24" />;
  if (error) return <ApiErrorState message={error} onRetry={onRetry} className="my-16" />;

  return (
    <>
      <StepToolbar
        showingCount={pageItems.length}
        totalCount={processed.length}
        resultsNoun={t("sales.newOrder.resultsNoun.results")}
        sortValue={sort}
        sortOptions={productSortOptions}
        onSortChange={(value) => {
          setSort(value as SortOption);
          setCurrentPage(1);
        }}
        searchOpen={searchOpen}
        searchVisible={searchVisible}
        onToggleSearch={toggleSearch}
        searchQuery={query}
        onSearchChange={(value) => {
          setQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t("sales.newOrder.productStep.searchPlaceholder")}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <Select
          value={suitableFor}
          onValueChange={(value) => {
            setSuitableFor((value ?? "all") as "all" | SuitableFor);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="h-10 min-w-0 bg-card sm:w-40">
            <SelectValue>{(value) => t(SUITABLE_FOR_KEYS[value as "all" | SuitableFor])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SUITABLE_FOR_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(SUITABLE_FOR_KEYS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus((value ?? "all") as "all" | StockStatus);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="h-10 min-w-0 bg-card sm:w-36">
            <SelectValue>{(value) => t(STOCK_STATUS_OPTION_KEYS[value as "all" | StockStatus])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STOCK_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(STOCK_STATUS_OPTION_KEYS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pageItems.length === 0 ? (
        <ApiEmptyState message={t("sales.newOrder.productStep.noResults")} className="py-16" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((product) => {
            const selected = product.id in selectedProducts;
            return (
              <div key={product.id}>
                <SelectableProductCard product={product} selected={selected} onToggle={() => onToggle(product.id)} />
                {selected && (
                  <AreaCalculatorCard
                    product={product}
                    value={selectedProducts[product.id] ?? ""}
                    onChange={(value) => onAreaChange(product.id, value)}
                    onStockAdjusted={onStockAdjusted}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="py-6">
          <PaginationContent className="gap-1 sm:gap-2">
            <PaginationItem>
              <PaginationLink
                href="#"
                size="sm"
                className="gap-1 text-ink hover:text-amber"
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
                className="text-ink hover:text-amber"
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
                  <PaginationEllipsis />
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
                className="text-ink hover:text-amber"
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
                className="gap-1 text-ink hover:text-amber"
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
      )}
    </>
  );
};

type OrderLine = { product: ApiProduct; area: number; boxes: number; additionalPieces: number; pieces: number; lineTotal: number };

const ReviewStep = ({ customer, items, grandTotal }: { customer: CustomerSummary; items: OrderLine[]; grandTotal: number }) => {
  const { t } = useTranslation();
  const qtyLine = (boxes: number, additionalPieces: number, pieces: number) =>
    t("sales.newOrder.review.quantityLine", {
      boxes,
      extra: additionalPieces > 0 ? t("sales.newOrder.review.quantityExtra", { count: additionalPieces }) : "",
      pieces,
    });

  return (
  <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
    <section className="overflow-hidden rounded-2xl bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-ink sm:text-2xl">{t("sales.newOrder.review.orderItems")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("sales.newOrder.review.intro")}</p>
        </div>
        <Badge variant="secondary">{t("sales.newOrder.review.itemsCount", { count: items.length })}</Badge>
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
                  {area} sqm • {qtyLine(boxes, additionalPieces, pieces)} • {formatRWF(Number(product.price))}
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
              <TableHead>{t("sales.newOrder.review.colProduct")}</TableHead>
              <TableHead>{t("sales.newOrder.review.colQuantity")}</TableHead>
              <TableHead>{t("sales.newOrder.review.colUnitPrice")}</TableHead>
              <TableHead>{t("sales.newOrder.review.colTotal")}</TableHead>
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
                    {qtyLine(boxes, additionalPieces, pieces)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatRWF(Number(product.price))}</TableCell>
                <TableCell className="whitespace-nowrap font-semibold text-ink">{formatRWF(lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 bg-primary px-5 py-6 sm:justify-end sm:px-10">
        <span className="font-data text-lg font-semibold text-primary-foreground sm:text-2xl">{t("sales.newOrder.review.total")}</span>
        <span className="font-data text-xl font-bold text-primary-foreground sm:text-3xl">{formatRWF(grandTotal)}</span>
      </div>
    </section>

    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
          <Contact className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-ink sm:text-xl">{t("sales.newOrder.review.customerInfo")}</h2>
      </div>
      <dl className="mt-5 space-y-5 text-sm">
        <div>
          <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.newOrder.review.customer")}</dt>
          <dd className="mt-2 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
              {customer.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </span>
            <span className="text-ink">{customer.fullName}</span>
          </dd>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.newOrder.review.email")}</dt>
            <dd className="truncate text-ink">{customer.email ?? "—"}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.newOrder.review.phone")}</dt>
            <dd className="text-ink">{customer.phone ?? "—"}</dd>
          </div>
        </div>
      </dl>
    </section>
  </div>
  );
};

const CreateOrderWizard = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customer");

  const {
    data: customersData,
    loading: customersLoading,
    error: customersError,
    reload: reloadCustomers,
  } = useApi(() => usersApi.listCustomers({ limit: 100 }));
  const customers = useMemo(() => customersData?.items ?? [], [customersData]);

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApi(() => productsApi.list({ limit: 100 }));
  const products = useMemo(() => productsData?.items ?? [], [productsData]);

  const [step, setStep] = useState(1);
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Runs once, after the real customer list has loaded (needed to validate
  // a `?customer=` id) — restores a saved draft, unless the URL explicitly
  // points at a *different* customer, in which case that link wins and
  // starts a fresh draft for them instead of resuming stale product picks.
  if (!hydrated && !customersLoading) {
    setHydrated(true);
    const draft = readOrderDraft(ORDER_DRAFT_KEY);
    const validPreselect = preselectedId !== null && customers.some((customer) => customer.id === preselectedId);

    if (validPreselect && (!draft || draft.customerId !== preselectedId)) {
      setSelectedCustomerId(preselectedId);
      setStep(2);
      setMaxReachedStep(2);
    } else if (draft) {
      setSelectedCustomerId(draft.customerId);
      setSelectedProducts(draft.selectedProducts);
      setStep(draft.step);
      setMaxReachedStep(draft.maxReachedStep);
    }
  }

  // Persists every change once hydration has settled — never before, or
  // this would immediately overwrite a just-restored draft with the blank
  // initial state from the render before it.
  useEffect(() => {
    if (!hydrated) return;
    writeOrderDraft(ORDER_DRAFT_KEY, {
      customerId: selectedCustomerId,
      selectedProducts,
      step,
      maxReachedStep,
      savedAt: new Date().toISOString(),
    });
  }, [hydrated, selectedCustomerId, selectedProducts, step, maxReachedStep]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedProductIds = Object.keys(selectedProducts);

  const isWithinStock = (id: string) => {
    const product = products.find((item) => item.id === id);
    const value = selectedProducts[id];
    if (!product || !isPositiveNumber(value)) return false;
    return Number(value) <= availableStockOf(product);
  };

  const allAreasValid = selectedProductIds.length > 0 && selectedProductIds.every(isWithinStock);

  const orderItems: OrderLine[] = useMemo(() => {
    if (step !== 3 || !allAreasValid) return [];
    return selectedProductIds.map((id) => {
      const product = products.find((item) => item.id === id) as ApiProduct;
      const area = Number(selectedProducts[id]);
      const calc = calculateTileQuantity(area, tilePackagingOf(product));
      return {
        product,
        area,
        boxes: calc.completeBoxes,
        additionalPieces: calc.remainingPieces,
        pieces: calc.totalPieces,
        lineTotal: Number(product.price) * area,
      };
    });
  }, [step, allAreasValid, selectedProductIds, selectedProducts, products]);

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

  const handleCreateOrder = async () => {
    if (!selectedCustomer || !allAreasValid) return;
    setSubmitting(true);
    try {
      const result = await ordersApi.create({
        type: "PURCHASE",
        customerId: selectedCustomer.id,
        items: selectedProductIds.map((id) => ({ productId: id, areaSqm: Number(selectedProducts[id]) })),
      });
      if (!result.orderCreated) {
        // Shouldn't happen — every line was validated against on-hand stock
        // before reaching this step — but stock can still move between then
        // and now, so fall back to the negotiation the server already opened.
        toast.error(t("sales.newOrder.toast.stockChangedTitle"), {
          description: t("sales.newOrder.toast.stockChangedBody"),
        });
        return;
      }
      toast.success(t("sales.newOrder.toast.createdTitle"), {
        description: t("sales.newOrder.toast.createdBody", {
          count: orderItems.length,
          customer: selectedCustomer.fullName,
          total: formatRWF(grandTotal),
        }),
      });
      // The draft's job is done — clear it so a later visit to "New Order"
      // starts blank instead of resuming an order that already exists.
      clearOrderDraft(ORDER_DRAFT_KEY);
      // `addDelivery=1` opens the delivery-details dialog immediately on
      // arrival, so adding it is one continuous flow instead of a separate
      // trip back to this order later.
      router.push(`/stock/orders/${result.order.id}?addDelivery=1`);
    } catch (cause) {
      toast.error(t("sales.newOrder.toast.failedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("sales.newOrder.toast.failedBody"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = step === 1 ? selectedCustomerId !== null : step === 2 ? allAreasValid : false;

  return (
    <>
      <StockDetailHeader
        breadcrumbs={[
          { label: t("sales.newOrder.crumbOverview"), href: "/stock/overview" },
          { label: t("sales.newOrder.crumbOrders"), href: "/stock/orders" },
          { label: t("sales.newOrder.crumbNew") },
        ]}
        title={t("sales.newOrder.title")}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/stock/orders")} className="h-11 px-5 text-sm font-bold">
            {t("sales.newOrder.cancel")}
          </Button>
        }
      />

      <div className="space-y-5 sm:space-y-6">
        <OrderStepper step={step} maxReachedStep={maxReachedStep} onStepClick={setStep} />

        {step === 1 && (
          <CustomerStep
            customers={customers}
            loading={customersLoading}
            error={customersError}
            onRetry={reloadCustomers}
            selectedId={selectedCustomerId}
            onSelect={setSelectedCustomerId}
          />
        )}
        {step === 2 && (
          <ProductStep
            products={products}
            loading={productsLoading}
            error={productsError}
            onRetry={reloadProducts}
            selectedProducts={selectedProducts}
            onToggle={toggleProduct}
            onAreaChange={setProductArea}
            onStockAdjusted={reloadProducts}
          />
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
            {t("sales.newOrder.back")}
          </Button>

          {step < 3 ? (
            <Button type="button" disabled={!canGoNext} onClick={goNext} className="h-12 px-6 text-sm font-bold disabled:opacity-60">
              {t("sales.newOrder.next")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting || !allAreasValid}
              onClick={() => void handleCreateOrder()}
              className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-60"
            >
              <Save className="size-4" />
              {submitting ? t("sales.newOrder.creating") : t("sales.newOrder.createOrder")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

const NewOrderPage = () => (
  <Suspense fallback={null}>
    <CreateOrderWizard />
  </Suspense>
);

export default NewOrderPage;
