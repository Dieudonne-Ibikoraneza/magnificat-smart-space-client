"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  Filter,
  Loader2,
  PackageCheck,
  Ruler,
  Search,
  Truck,
} from "lucide-react";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FilterOptionsCard } from "@/components/product-catalog";
import { Switch } from "@/components/ui/switch";
import { calculatorApi, eventsApi, productsApi, toProduct } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import {
  buildFilterGroups,
  EMPTY_FILTERS,
  filterProducts,
  hasActiveFilters,
  toggleFilterOption,
  type CatalogFilters,
} from "@/lib/catalog-utils";
import { useApi } from "@/lib/api/use-api";
import { getSessionId } from "@/lib/session-id";
import type { FloorPlanCalculation } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const DEFAULT_WASTAGE_PERCENT = 10;
/** Recalculates this long after the customer stops typing — real-time
 * enough to feel live, without a request per keystroke. */
const DEBOUNCE_MS = 450;

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;
const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Floor plan calculator (doc 3.8): the client enters room dimensions, we add a
 * wastage allowance, and return the material needed split between what current
 * stock covers and what has to be sourced separately, with an estimated cost —
 * all computed server-side (`POST /calculator/floor-plan`) against the real
 * catalog and real stock, not a client-side estimate over mock data.
 */
export default function FloorPlanCalculatorPage() {
  const { t } = useTranslation();
  const {
    data: productsPage,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApi(() => productsApi.list({ limit: 100 }));
  const products = useMemo(() => (productsPage?.items ?? []).map((item) => toProduct(item)), [productsPage]);

  const [lengthM, setLengthM] = useState("6");
  const [widthM, setWidthM] = useState("5");
  const [totalAreaSqm, setTotalAreaSqm] = useState("");
  const [useTotalArea, setUseTotalArea] = useState(false);
  const [wastagePercent, setWastagePercent] = useState(String(DEFAULT_WASTAGE_PERCENT));
  const [productId, setProductId] = useState<string | null>(null);

  // Lands on the first loaded product once the catalog arrives, unless the
  // customer already picked one — a derived default, not an effect, so there's
  // nothing to synchronize after the fact (see `useApi`'s own convention).
  const [defaultedProducts, setDefaultedProducts] = useState(productsPage);
  if (defaultedProducts !== productsPage) {
    setDefaultedProducts(productsPage);
    if (!productId && products.length > 0) setProductId(products[0].id);
  }

  const [tileSearch, setTileSearch] = useState("");
  const [tileFilters, setTileFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [tileFiltersOpen, setTileFiltersOpen] = useState(false);
  const tileFilterGroups = useMemo(() => buildFilterGroups(products), [products]);
  const filteredProducts = useMemo(() => {
    const term = tileSearch.trim().toLowerCase();
    const searched = term
      ? products.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            item.collection.toLowerCase().includes(term) ||
            item.size.toLowerCase().includes(term),
        )
      : products;
    return filterProducts(searched, tileFilters);
  }, [products, tileSearch, tileFilters]);

  // Selection stays whatever the customer last picked even if a search/filter
  // change hides it from the visible list below — narrowing the picker is
  // about browsing, not about silently swapping out their chosen tile.
  const product = products.find((item) => item.id === productId) ?? products[0];
  const baseArea = useTotalArea
    ? Number(totalAreaSqm) || 0
    : (Number(lengthM) || 0) * (Number(widthM) || 0);

  const [result, setResult] = useState<FloorPlanCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const enteredDimensionsFiredRef = useRef(false);

  useEffect(() => {
    // Nothing to fetch — the render below already keys off `baseArea <= 0`
    // directly rather than this effect's state, so there's no stale
    // `result`/`calcError` to clear here (see the "Updating…" badge's own
    // `baseArea > 0` guard for the one place that could otherwise leak).
    if (!product || baseArea <= 0) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setCalculating(true);
      calculatorApi
        .floorPlan({
          productId: product.id,
          length: useTotalArea ? undefined : Number(lengthM) || undefined,
          width: useTotalArea ? undefined : Number(widthM) || undefined,
          totalAreaSqm: useTotalArea ? Number(totalAreaSqm) || undefined : undefined,
          wastagePercent: Number(wastagePercent) || 0,
        })
        .then((data) => {
          if (!active) return;
          setResult(data);
          setCalcError(null);
          if (!enteredDimensionsFiredRef.current) {
            enteredDimensionsFiredRef.current = true;
            void eventsApi
              .journey({ sessionId: getSessionId(), stage: "ENTERED_DIMENSIONS" })
              .catch(() => undefined);
          }
        })
        .catch((cause) => {
          if (!active) return;
          setCalcError(
            cause instanceof ApiError ? cause.message : t("calculator.calcError"),
          );
        })
        .finally(() => {
          if (active) setCalculating(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, baseArea, lengthM, widthM, totalAreaSqm, useTotalArea, wastagePercent, retryToken]);

  const breakdown = result
    ? [
        { key: "roomArea", label: t("calculator.breakdown.roomArea"), value: `${formatNumber(result.baseAreaSqm)} m²` },
        { key: "withWastage", label: t("calculator.breakdown.withWastage", { percent: result.wastagePercent }), value: `${formatNumber(result.requiredAreaSqm)} m²` },
        { key: "completeBoxes", label: t("calculator.breakdown.completeBoxes"), value: result.quantity.completeBoxes.toLocaleString() },
        { key: "additionalPieces", label: t("calculator.breakdown.additionalPieces"), value: result.quantity.remainingPieces.toLocaleString() },
        { key: "totalPieces", label: t("calculator.breakdown.totalPieces"), value: result.quantity.totalPieces.toLocaleString() },
        { key: "materialPurchased", label: t("calculator.breakdown.materialPurchased"), value: `${formatNumber(result.quantity.purchasedArea)} m²` },
      ]
    : [];

  if (productsLoading) {
    return <ApiLoading label={t("calculator.loading")} className="py-24" />;
  }

  if (productsError) {
    return <ApiErrorState message={productsError} onRetry={reloadProducts} className="my-16" />;
  }

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("calculator.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t("calculator.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {t("calculator.intro")}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-start">
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-2">
            <Ruler className="size-5 text-ink" />
            <h2 className="text-lg font-bold text-ink">{t("calculator.yourSpace")}</h2>
          </div>

          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{t("calculator.knowTotalArea")}</p>
              <p className="mt-0.5 text-xs text-muted">{t("calculator.knowTotalAreaHint")}</p>
            </div>
            <Switch
              checked={useTotalArea}
              onCheckedChange={setUseTotalArea}
              aria-label={t("calculator.useTotalAreaAria")}
            />
          </div>

          {useTotalArea ? (
            <Field>
              <FieldLabel htmlFor="fp-total-area">{t("calculator.totalAreaLabel")}</FieldLabel>
              <Input
                id="fp-total-area"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={totalAreaSqm}
                onChange={(event) => setTotalAreaSqm(event.target.value)}
                placeholder={t("calculator.totalAreaPlaceholder")}
                className="h-12 text-base font-semibold"
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fp-length">{t("calculator.lengthLabel")}</FieldLabel>
                <Input
                  id="fp-length"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={lengthM}
                  onChange={(event) => setLengthM(event.target.value)}
                  className="h-12 text-base font-semibold"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fp-width">{t("calculator.widthLabel")}</FieldLabel>
                <Input
                  id="fp-width"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={widthM}
                  onChange={(event) => setWidthM(event.target.value)}
                  className="h-12 text-base font-semibold"
                />
              </Field>
            </div>
          )}

          <Field className="mt-4">
            <FieldLabel htmlFor="fp-wastage">{t("calculator.wastageLabel")}</FieldLabel>
            <Input
              id="fp-wastage"
              type="number"
              min="0"
              max="50"
              step="1"
              inputMode="numeric"
              value={wastagePercent}
              onChange={(event) => setWastagePercent(event.target.value)}
              className="h-12 text-base font-semibold"
            />
            <p className="mt-2 text-xs text-muted">
              {t("calculator.wastageHint", { percent: DEFAULT_WASTAGE_PERCENT })}
            </p>
          </Field>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("calculator.chooseTile")}</p>
              <div className="relative shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTileFiltersOpen((open) => !open)}
                  aria-pressed={tileFiltersOpen}
                  className={cn("h-8 gap-1.5 border-slate-200 px-2.5 text-xs font-bold", tileFiltersOpen && "bg-muted-background")}
                >
                  <Filter className="size-3.5" /> {t("calculator.filters")}
                  {hasActiveFilters(tileFilters) && (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-ink">
                      {Object.values(tileFilters).reduce((sum, group) => sum + group.length, 0)}
                    </span>
                  )}
                </Button>

                {tileFiltersOpen && (
                  <>
                    <button
                      type="button"
                      aria-label={t("calculator.closeFilters")}
                      className="fixed inset-0 z-20 cursor-default"
                      onClick={() => setTileFiltersOpen(false)}
                    />
                    <div className="absolute top-full right-0 z-30 mt-2 max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,39,71,0.16)]">
                      <FilterOptionsCard
                        bare
                        filters={tileFilters}
                        onToggle={(group, option) =>
                          setTileFilters((current) => toggleFilterOption(current, group, option))
                        }
                        onReset={() => setTileFilters(EMPTY_FILTERS)}
                        groups={tileFilterGroups}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={tileSearch}
                onChange={(event) => setTileSearch(event.target.value)}
                placeholder={t("calculator.searchTilesPlaceholder")}
                aria-label={t("calculator.searchTilesAria")}
                className="h-10 rounded-xl bg-white py-0 pl-10 leading-10"
              />
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">{t("calculator.noTiles")}</p>
              ) : (
                filteredProducts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProductId(item.id)}
                    aria-pressed={item.id === productId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      item.id === productId
                        ? "border-ink bg-secondary"
                        : "border-slate-100 hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" sizes="48px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {item.size} · {t("calculator.pricePerSqm", { price: formatRWF(item.price) })}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-ink" />
                <h2 className="text-lg font-bold text-ink">{t("calculator.materialRequired")}</h2>
              </div>
              {calculating && result && baseArea > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> {t("calculator.updating")}
                </span>
              )}
            </div>

            {baseArea <= 0 ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {t("calculator.enterToSee", {
                  what: useTotalArea
                    ? t("calculator.enterToSee_totalArea")
                    : t("calculator.enterToSee_dimensions"),
                })}
              </p>
            ) : calcError ? (
              <ApiErrorState
                message={calcError}
                onRetry={() => setRetryToken((token) => token + 1)}
                className="py-8"
              />
            ) : !result ? (
              <ApiLoading label={t("calculator.calculating")} className="py-8" />
            ) : (
              <>
                <dl className="space-y-3 text-sm">
                  {breakdown.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="font-data font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="text-base font-bold text-ink">{t("calculator.estimatedCost")}</p>
                  <p className="text-xl font-bold text-ink">{formatRWF(result.estimatedCost)}</p>
                </div>
              </>
            )}
          </section>

          {result && (() => {
            // Deliberately qualitative — the calculator tells the customer
            // whether their requirement is covered by current stock, never the
            // shop's actual quantity on hand (the API doesn't send it).
            const availability = result.stockSplit.fullyAvailableFromStock
              ? "full"
              : result.stockSplit.partiallyAvailableFromStock
                ? "partial"
                : "none";
            const availabilityStyles = {
              full: "border-green-200 bg-green-50 text-green-800",
              partial: "border-amber/30 bg-amber-50 text-amber-900",
              none: "border-slate-100 bg-[#F9FAFB] text-ink",
            } as const;

            return (
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-2">
                <PackageCheck className="size-5 text-ink" />
                <h2 className="text-lg font-bold text-ink">{t("calculator.stockSplit")}</h2>
              </div>

              <div className={cn("rounded-xl border p-4", availabilityStyles[availability])}>
                <p className="text-[11px] font-bold uppercase tracking-wide">
                  {t(`calculator.stockStatus.${availability}`)}
                </p>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
                <Truck className="mt-0.5 size-3.5 shrink-0" />
                {t(`calculator.availabilityNote.${availability}`)}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  nativeButton={false}
                  render={<Link href={`/products/${product.id}`} />}
                  variant="outline"
                  className="h-12 w-full font-bold"
                >
                  {t("calculator.viewThisTile")}
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/account/cart" />}
                  className="group h-12 w-full gap-2 bg-primary font-bold text-ink hover:bg-primary/90"
                >
                  {t("calculator.addToOrder")}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>
            </section>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
