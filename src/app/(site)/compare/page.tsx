"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Minus, Plus, Scale, Search, X } from "lucide-react";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { CompareSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { Product } from "@/components/product-card";
import { cn } from "@/lib/utils";

/** Three is what the chatbot offers and what fits side by side on a phone-width scroll. */
const MAX_COMPARED = 3;

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;
const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const stockLabels: Record<Product["stockStatus"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const stockTone: Record<Product["stockStatus"], string> = {
  in_stock: "bg-green-50 text-green-700",
  low_stock: "bg-amber-50 text-amber-800",
  out_of_stock: "bg-red-50 text-red-700",
};

const suitableForLabels: Record<Product["suitableFor"], string> = {
  floor: "Floor only",
  wall: "Wall only",
  both: "Floor & wall",
};

/**
 * Each comparison row pulls one attribute off a product. Keeping them in a list
 * means the table stays a single map over rows × products, and the "differs"
 * highlight is computed the same way for every attribute.
 */
const comparisonRows: {
  label: string;
  value: (product: Product) => string;
}[] = [
  { label: "Price per m²", value: (p) => formatRWF(p.price) },
  { label: "Price per box", value: (p) => formatRWF(p.price * p.boxCoverage) },
  { label: "Tile size", value: (p) => p.size },
  { label: "Area per piece", value: (p) => `${formatNumber(p.tileArea)} m²` },
  { label: "Coverage per box", value: (p) => `${formatNumber(p.boxCoverage)} m²` },
  { label: "Pieces per box", value: (p) => String(p.piecesPerBox) },
  { label: "Suitable for", value: (p) => suitableForLabels[p.suitableFor] },
  { label: "Recommended rooms", value: (p) => p.roomTypes.join(", ") },
  { label: "Availability", value: (p) => stockLabels[p.stockStatus] },
  { label: "SKU", value: (p) => p.sku },
];

const ComparePageContent = () => {
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useApi(() => productsApi.list({ limit: 100 }));
  const products = useMemo(() => data?.items.map((product) => toProduct(product)) ?? [], [data]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [search, setSearch] = useState("");

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
    setSelectedIds(requestedIds.length > 0 ? requestedIds : products.slice(0, 2).map((product) => product.id));
    setSeeded(true);
  }

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => product !== undefined),
    [selectedIds, products],
  );

  const pickerResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.size.toLowerCase().includes(term),
    );
  }, [search, products]);

  const toggle = (id: string) =>
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_COMPARED) return current;
      return [...current, id];
    });

  /** A row is worth highlighting only when the products actually differ on it. */
  const differs = (row: (typeof comparisonRows)[number]) =>
    selected.length > 1 && new Set(selected.map((product) => row.value(product))).size > 1;

  if (loading) return <CompareSkeleton />;
  if (error) return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  if (products.length === 0) {
    return <ApiEmptyState message="No products are available to compare yet." className="my-16" />;
  }

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Compare tiles</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          <Scale className="size-8 shrink-0 text-amber" /> Side-by-side comparison
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Put up to {MAX_COMPARED} tiles next to each other and compare specifications, coverage and
          suitability before you decide. Differences are highlighted.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          {selected.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Pick at least one tile from the list to start comparing.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              <table className="w-full min-w-[540px] border-collapse text-sm">
                <caption className="sr-only">Tile specifications compared side by side</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-40 pb-4 text-left align-bottom">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Specification
                      </span>
                    </th>
                    {selected.map((product) => (
                      <th key={product.id} scope="col" className="px-3 pb-4 text-left align-bottom">
                        {/* Capped and centered so every compared tile's photo, name and badge line up
                            at the same size — otherwise the table's own column width (which grows with
                            whichever product has the longest text, e.g. "Recommended rooms") would stretch
                            a photo wider than its neighbours purely because of unrelated cell content. */}
                        <div className="relative mx-auto w-full max-w-[180px]">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => toggle(product.id)}
                            aria-label={`Remove ${product.name} from the comparison`}
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
                            {stockLabels[product.stockStatus]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.label}
                      className={cn(
                        "border-t border-slate-100",
                        differs(row) && "bg-amber-50/40",
                      )}
                    >
                      <th scope="row" className="py-3.5 pr-3 text-left align-top text-xs font-semibold text-muted">
                        {row.label}
                      </th>
                      {selected.map((product) => (
                        <td
                          key={product.id}
                          className="px-3 py-3.5 align-top font-data text-sm font-semibold text-ink"
                        >
                          {row.value(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-slate-100">
                    <th scope="row" className="py-4 pr-3 text-left align-top text-xs font-semibold text-muted">
                      Actions
                    </th>
                    {selected.map((product) => (
                      <td key={product.id} className="px-3 py-4 align-top">
                        <div className="mx-auto w-full max-w-[180px]">
                          <Button
                            nativeButton={false}
                            render={<Link href={`/products/${product.id}`} />}
                            className="group h-10 w-full gap-2 bg-primary text-xs font-bold text-ink hover:bg-primary/90"
                          >
                            View details
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
          <h2 className="text-base font-bold text-ink">Choose tiles</h2>
          <p className="mt-1 text-xs text-muted">
            {selected.length} of {MAX_COMPARED} selected
          </p>

          <div className="relative mt-4">
            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, SKU or size..."
              aria-label="Search tiles to compare"
              className="h-11 rounded-lg pl-10 text-sm"
            />
          </div>

          <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {pickerResults.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              const atLimit = !isSelected && selectedIds.length >= MAX_COMPARED;

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
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
            {pickerResults.length === 0 && (
              <li className="py-8 text-center text-sm text-muted">No tiles match that search.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted">Loading comparison…</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
