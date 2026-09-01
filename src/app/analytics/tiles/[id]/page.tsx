"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Boxes,
  Eye,
  Layers3,
  Maximize2,
  MousePointerClick,
  MousePointerSquareDashed,
  Package,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { AnalyticsDetailHeader } from "@/app/analytics/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { analyticsApi, productsApi } from "@/lib/api";
import { toProduct, roomTypeLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { formatCompactNumber } from "@/lib/utils";
import type { StockStatus } from "@/lib/api/types";

type TileDetailPageProps = { params: Promise<{ id: string }> };

const stockLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};
const stockStyles: Record<StockStatus, string> = {
  in_stock: "border-green-200 bg-green-50 text-green-700",
  low_stock: "border-amber/30 bg-white text-amber",
  out_of_stock: "border-red-200 bg-red-50 text-red-700",
};

const getSuitableFor = (suitableFor: "floor" | "wall" | "both") => {
  const badges: { label: string; icon: typeof Layers3 }[] = [];
  if (suitableFor === "floor" || suitableFor === "both") badges.push({ label: "Floor", icon: Layers3 });
  if (suitableFor === "wall" || suitableFor === "both") badges.push({ label: "Wall", icon: Maximize2 });
  return badges;
};

/** Analyst view — read-only: interaction stats + the same product details staff see elsewhere, no edit/action controls. */
const TileDetailPage = ({ params }: TileDetailPageProps) => {
  const { id } = use(params);
  const { data: apiProduct, loading: productLoading, error: productError, reload: reloadProduct } = useApi(
    () => productsApi.get(id),
    [id],
  );
  const { data: rates, loading: ratesLoading, error: ratesError, reload: reloadRates } = useApi(
    () => analyticsApi.tileRates(id),
    [id],
  );

  if (productLoading && !apiProduct) return <ApiLoading label="Loading tile…" className="py-32" />;

  if (productError) {
    if (productError.toLowerCase().includes("not found")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">Tile not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This product doesn&apos;t exist.</p>
          <Button nativeButton={false} render={<Link href="/analytics/tiles" />} className="mt-6 h-11 gap-2 px-5">
            Back to Tiles Analytics
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={productError} onRetry={reloadProduct} className="my-16" />;
  }

  if (!apiProduct) return null;

  const product = toProduct(apiProduct);
  const currentStock = apiProduct.quantityOnHandSqm ?? 0;
  const breakdown = apiProduct.onHandBreakdown;

  const interactionStats = [
    { icon: Eye, label: "Views", value: rates ? formatCompactNumber(rates.viewed) : "—" },
    { icon: MousePointerSquareDashed, label: "Applications", value: rates ? formatCompactNumber(rates.applied) : "—" },
    { icon: ShoppingBasket, label: "Purchases", value: rates ? formatCompactNumber(rates.purchased) : "—" },
    { icon: MousePointerClick, label: "Selection Rate", value: rates ? `${rates.selectionRate.toFixed(1)}%` : "—" },
    { icon: Wallet, label: "Purchase Conversion", value: rates ? `${rates.purchaseConversion.toFixed(1)}%` : "—" },
  ];

  return (
    <>
      <AnalyticsDetailHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/analytics/overview" },
          { label: "Tiles Analytics", href: "/analytics/tiles" },
          { label: product.name },
        ]}
        title={product.name}
      />

      <div className="space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ratesLoading && !rates
            ? Array.from({ length: 5 }).map((_, index) => (
                <article key={index} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
                  <div className="h-5 w-5 animate-pulse rounded bg-muted-background" />
                  <div className="mt-6 h-3 w-20 animate-pulse rounded bg-muted-background" />
                  <div className="mt-2 h-6 w-16 animate-pulse rounded bg-muted-background" />
                </article>
              ))
            : interactionStats.map(({ icon: Icon, label, value }) => (
                <article
                  key={label}
                  className="flex flex-col rounded-2xl bg-card p-5 transition-transform duration-200 active:scale-95 sm:p-6"
                >
                  <Icon className="size-5 stroke-2 text-ink" />
                  <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-xl font-black text-ink">{value}</p>
                </article>
              ))}
        </div>

        {ratesError ? <ApiErrorState message={ratesError} onRetry={reloadRates} /> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
          <div className="space-y-6">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted-background sm:aspect-4/3 lg:aspect-square">
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 55vw"
                priority
              />
            </div>
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="border-b border-slate-100 pb-4 text-xl font-bold text-ink">
                Product Story
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {product.description || "No description yet."}
              </p>
            </section>
          </div>
          <div className="space-y-6">
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">
                    {product.size} • SKU {product.sku}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
                    {product.name}
                  </h2>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stockStyles[product.stockStatus]}`}
                >
                  {stockLabels[product.stockStatus]}
                </span>
              </div>
              <p className="mt-6 text-2xl font-bold text-ink">
                {product.price.toLocaleString("en-US")} RWF{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  / sqm
                </span>
              </p>
              <div className="mt-5 border-b border-slate-100 pb-6">
                <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">Current Stock Level</span>
                    <span className="font-data text-xl font-bold text-ink">
                      {currentStock.toLocaleString()} <span className="text-sm font-normal">sqm</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 py-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Size
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {product.size}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Per box
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {product.boxCoverage} m² ({product.piecesPerBox} pcs)
                  </p>
                </div>
                {breakdown && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      On hand (boxes)
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Boxes className="size-4" />
                      {breakdown.completeBoxes} + {breakdown.remainingPieces} pcs
                    </p>
                  </div>
                )}
                {apiProduct.averageCostPrice !== undefined && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Avg. cost / sqm
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Package className="size-4" />
                      {Math.round(apiProduct.averageCostPrice).toLocaleString("en-US")} RWF
                    </p>
                  </div>
                )}
              </div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Suitable for
              </p>
              <div className="flex flex-wrap gap-3">
                {getSuitableFor(product.suitableFor).map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                  >
                    <Icon className="size-4" />
                    {label}
                  </span>
                ))}
              </div>
              {apiProduct.roomTypes.length > 0 && (
                <>
                  <p className="mt-5 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Room types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {apiProduct.roomTypes.map((roomType) => (
                      <span
                        key={roomType}
                        className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {roomTypeLabels[roomType]}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>
            <QuantityCalculator product={product} />
          </div>
        </div>
      </div>
    </>
  );
};

export default TileDetailPage;
