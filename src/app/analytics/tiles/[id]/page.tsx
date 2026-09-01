"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  Layers,
  MousePointerClick,
  MousePointerSquareDashed,
  Package,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { AnalyticsDetailHeader } from "@/app/analytics/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyticsApi, productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { cn, formatCompactCurrency, formatCompactNumber } from "@/lib/utils";

type TileDetailPageProps = { params: Promise<{ id: string }> };

const stockStatusMeta = {
  in_stock: { label: "In stock", dot: "bg-green-500", text: "text-green-700" },
  low_stock: { label: "Low stock", dot: "bg-amber-500", text: "text-amber-600" },
  out_of_stock: { label: "Out of stock", dot: "bg-red-500", text: "text-red-600" },
} as const;

/** Analyst view — read-only: interaction stats and product details, no edit/action controls. */
const TileDetailPage = ({ params }: TileDetailPageProps) => {
  const { id } = use(params);
  const { data: product, loading: productLoading, error: productError, reload: reloadProduct } = useApi(
    () => productsApi.get(id),
    [id],
  );
  const { data: rates, loading: ratesLoading, error: ratesError, reload: reloadRates } = useApi(
    () => analyticsApi.tileRates(id),
    [id],
  );

  if (productLoading && !product) return <ApiLoading label="Loading tile…" className="py-32" />;

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

  if (!product) return null;

  const status = stockStatusMeta[product.stockStatus];

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
        meta={
          <>
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", status.text)}>
              <span className={cn("size-2 rounded-full", status.dot)} />
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="size-4" />
              {product.sku}
            </span>
          </>
        }
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
                <article key={label} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
                  <Icon className="size-5 stroke-2 text-ink" />
                  <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-xl font-black text-ink">{value}</p>
                </article>
              ))}
        </div>

        {ratesError ? <ApiErrorState message={ratesError} onRetry={reloadRates} /> : null}

        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1fr_1.4fr]">
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="relative aspect-square w-full bg-muted-background">
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 40vw"
              />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
                {product.size}
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink">{product.name}</h2>
              {product.description ? (
                <p className="mt-2 text-sm leading-5 text-muted">{product.description}</p>
              ) : null}
              <p className="mt-4 text-xl font-bold text-ink">
                {formatCompactCurrency(Number(product.price), product.currency)}
                <span className="ml-1 text-sm font-medium text-muted">/ m²</span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
                <Layers className="size-5" />
              </span>
              <h2 className="text-lg font-bold text-ink sm:text-xl">Product Details</h2>
            </div>
            <dl className="mt-5 space-y-5 text-sm">
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">SKU / Code</dt>
                <dd className="mt-1 font-data text-ink">{product.sku}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Size</dt>
                <dd className="mt-1 text-ink">{product.size}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Current Stock</dt>
                <dd className="mt-1 font-data text-ink">
                  {product.quantityOnHandSqm !== undefined
                    ? `${product.quantityOnHandSqm.toLocaleString()} sqm`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Box Coverage</dt>
                <dd className="mt-1 text-ink">
                  {Number(product.boxCoverageSqm).toLocaleString()} sqm / box • {product.piecesPerBox} pcs / box
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Status</dt>
                <dd className="mt-1">
                  <Badge variant="secondary" className="gap-1.5">
                    <span className={cn("size-2 rounded-full", status.dot)} />
                    {status.label}
                  </Badge>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
};

export default TileDetailPage;
