"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Loader2, Minus, Plus, Scale, Search, X } from "lucide-react";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { CompareSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productsApi, toProduct } from "@/lib/api";
import { InfiniteScrollTrigger, useInfiniteApi } from "@/lib/api/use-infinite-api";
import { useLocale } from "@/lib/i18n";
import type { Product } from "@/components/product-card";
import { cn } from "@/lib/utils";

/** Three is what the chatbot offers and what fits side by side on a phone-width scroll. */
const MAX_COMPARED = 3;

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;
const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const STOCK_KEYS = {
  in_stock: "product.stock.in_stock",
  low_stock: "product.stock.low_stock",
  out_of_stock: "product.stock.out_of_stock",
} as const;

const SUITABLE_FOR_KEYS = {
  floor: "compare.suitableFor.floor",
  wall: "compare.suitableFor.wall",
  both: "compare.suitableFor.both",
} as const;

/** Product room types arrive as display labels (see `toProduct`); map them back to translation keys. */
const ROOM_LABEL_KEYS = {
  "Living Room (Saloon)": "catalog.roomTypes.livingRoom",
  Bedroom: "catalog.roomTypes.bedroom",
  Bathroom: "catalog.roomTypes.bathroom",
  Kitchen: "catalog.roomTypes.kitchen",
} as const;

const stockTone: Record<Product["stockStatus"], string> = {
  in_stock: "bg-green-50 text-green-700",
  low_stock: "bg-amber-50 text-amber-800",
  out_of_stock: "bg-red-50 text-red-700",
};

const ComparePageContent = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const roomLabel = (room: string): string => {
    const key = ROOM_LABEL_KEYS[room as keyof typeof ROOM_LABEL_KEYS];
    return key ? t(key) : room;
  };

  /**
   * Each comparison row pulls one attribute off a product; the table is a single
   * map over rows × products and the "differs" highlight is computed the same way
   * for every attribute.
   */
  const comparisonRows: { label: string; value: (product: Product) => string }[] = [
    { label: t("compare.rows.pricePerSqm"), value: (p) => formatRWF(p.price) },
    { label: t("compare.rows.pricePerBox"), value: (p) => formatRWF(p.price * p.boxCoverage) },
    { label: t("compare.rows.tileSize"), value: (p) => p.size },
    { label: t("compare.rows.areaPerPiece"), value: (p) => `${formatNumber(p.tileArea)} m²` },
    { label: t("compare.rows.coveragePerBox"), value: (p) => `${formatNumber(p.boxCoverage)} m²` },
    { label: t("compare.rows.piecesPerBox"), value: (p) => String(p.piecesPerBox) },
    { label: t("compare.rows.suitableFor"), value: (p) => t(SUITABLE_FOR_KEYS[p.suitableFor]) },
    { label: t("compare.rows.recommendedRooms"), value: (p) => p.roomTypes.map(roomLabel).join(", ") },
    { label: t("compare.rows.availability"), value: (p) => t(STOCK_KEYS[p.stockStatus]) },
    { label: t("compare.rows.sku"), value: (p) => p.sku },
  ];
  const {
    items: productItems,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = useInfiniteApi(
    (page) => productsApi.list({ page, limit: 20, search: debouncedSearch || undefined }),
    [debouncedSearch],
  );
  const products = useMemo(
    () => productItems.map((product) => toProduct(product, undefined, locale)),
    [productItems, locale],
  );

  const [selected, setSelected] = useState<Product[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Products arrive asynchronously, so the `?ids=` seed (or the default
  // first-two) can only be applied once they're in — and only once, so it
  // doesn't stomp on selections the visitor has already made by then.
  // Adjusting state during render like this (rather than in an effect) is
  // the cheaper, endorsed way to sync to a value that just became available.
  if (!seeded && products.length > 0) {
    const requestedIds = (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => products.some((product) => product.id === id))
      .slice(0, MAX_COMPARED);
    setSelected(
      requestedIds.length > 0
        ? requestedIds
            .map((id) => products.find((product) => product.id === id))
            .filter((product): product is Product => product !== undefined)
        : products.slice(0, 2),
    );
    setSeeded(true);
  }

  const selectedIds = useMemo(() => selected.map((product) => product.id), [selected]);
  const pickerLoading = loading || search.trim() !== debouncedSearch;

  const toggle = (product: Product) =>
    setSelected((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.filter((item) => item.id !== product.id);
      }
      if (current.length >= MAX_COMPARED) return current;
      return [...current, product];
    });

  /** A row is worth highlighting only when the products actually differ on it. */
  const differs = (row: (typeof comparisonRows)[number]) =>
    selected.length > 1 && new Set(selected.map((product) => row.value(product))).size > 1;

  if (!seeded && loading) return <CompareSkeleton />;
  if (!seeded && error) return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  if (!seeded && products.length === 0) {
    return <ApiEmptyState message={t("compare.empty")} className="my-16" />;
  }

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("compare.eyebrow")}</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          <Scale className="size-8 shrink-0 text-amber" /> {t("compare.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {t("compare.intro", { max: MAX_COMPARED })}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          {selected.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              {t("compare.pickPrompt")}
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              <table className="w-full min-w-[540px] border-collapse text-sm">
                <caption className="sr-only">{t("compare.tableCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-40 pr-3 pb-4 pl-3 text-left align-bottom">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {t("compare.specification")}
                      </span>
                    </th>
                    {selected.map((product) => (
                      <th key={product.id} scope="col" className="px-3 pb-4 text-left align-bottom">
                        {/* Capped (not centered) so every compared tile's photo, name and badge line up
                            at the same size AND start flush with the spec rows below them — otherwise
                            the table's own column width (which grows with whichever product has the
                            longest text, e.g. "Recommended rooms") would both stretch a photo wider than
                            its neighbours and, if centered, drift its left edge away from where the data
                            cells below it (which start at this same column's own left inset) begin. */}
                        <div className="relative w-full max-w-[180px]">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => toggle(product)}
                            aria-label={t("compare.removeAria", { name: product.name })}
                            className="absolute -right-1 -top-1 z-10 rounded-full bg-white text-muted shadow-sm hover:text-ink"
                          >
                            <X className="size-3" />
                          </Button>
                          <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-muted-background">
                            <Image
                              src={product.image}
                              alt=""
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="180px"
                            />
                          </span>
                          <Link
                            href={`/products/${product.id}`}
                            className="mt-3 block text-sm font-bold text-ink hover:underline"
                          >
                            {product.name}
                          </Link>
                          <span
                            className={cn(
                              "mt-2 inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                              stockTone[product.stockStatus],
                            )}
                          >
                            {t(STOCK_KEYS[product.stockStatus])}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-t border-slate-100">
                      <th
                        scope="row"
                        className={cn(
                          "py-4 pr-3 pl-3 text-left align-top text-xs font-semibold text-muted first:rounded-l-lg",
                          differs(row) && "bg-amber-50",
                        )}
                      >
                        {row.label}
                      </th>
                      {selected.map((product, index) => (
                        <td
                          key={product.id}
                          className={cn(
                            "px-3 py-4 align-top font-data text-sm font-semibold text-ink",
                            differs(row) && "bg-amber-50",
                            differs(row) && index === selected.length - 1 && "rounded-r-lg",
                          )}
                        >
                          {row.value(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-slate-100">
                    <th scope="row" className="py-4 pr-3 pl-3 text-left align-top text-xs font-semibold text-muted">
                      {t("compare.actions")}
                    </th>
                    {selected.map((product) => (
                      <td key={product.id} className="px-3 py-4 align-top">
                        <div className="w-full max-w-[180px]">
                          <Button
                            nativeButton={false}
                            render={<Link href={`/products/${product.id}`} />}
                            className="group h-10 w-full gap-2 bg-primary text-xs font-bold text-ink hover:bg-primary/90"
                          >
                            {t("compare.viewDetails")}
                            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-ink">{t("compare.chooseTiles")}</h2>
          <p className="mt-1 text-xs text-muted">
            {t("compare.selectedCount", { selected: selected.length, max: MAX_COMPARED })}
          </p>

          <div className="relative mt-4">
            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("compare.searchPlaceholder")}
              aria-label={t("compare.searchAria")}
              className="h-11 rounded-lg pl-10 text-sm"
            />
          </div>

          <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {pickerLoading ? (
              <li className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("compare.loading")}
              </li>
            ) : products.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              const atLimit = !isSelected && selectedIds.length >= MAX_COMPARED;

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => toggle(product)}
                    disabled={atLimit}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      isSelected ? "border-ink bg-secondary" : "border-slate-100 hover:bg-[#F9FAFB]",
                      atLimit && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      <Image src={product.image} alt="" fill unoptimized className="object-cover" sizes="44px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {product.size} · {formatRWF(product.price)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        isSelected ? "bg-ink text-white" : "bg-muted-background text-muted",
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? <Check className="size-3.5" /> : atLimit ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {!pickerLoading && products.length === 0 && !error && (
              <li className="py-8 text-center text-sm text-muted">{t("compare.noSearchResults")}</li>
            )}
            {!pickerLoading && error && (
              <li className="py-6 text-center text-sm text-muted">
                <p>{error}</p>
                <Button type="button" variant="outline" onClick={reload} className="mt-3 h-9 px-4 text-xs">
                  {t("common.retry")}
                </Button>
              </li>
            )}
            {!pickerLoading && !error && <li>
              <InfiniteScrollTrigger
                hasMore={hasMore}
                loading={loadingMore}
                onLoadMore={loadMore}
              />
            </li>}
          </ul>
        </aside>
      </div>
    </div>
  );
};

const CompareFallback = () => {
  const { t } = useTranslation();
  return <div className="py-20 text-center text-sm text-muted">{t("compare.loading")}</div>;
};

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareFallback />}>
      <ComparePageContent />
    </Suspense>
  );
}
