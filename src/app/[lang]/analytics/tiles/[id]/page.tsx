"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Eye,
  GitCompareArrows,
  Heart,
  Layers3,
  Maximize2,
  MousePointerClick,
  MousePointerSquareDashed,
  Package,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { AnalyticsDetailHeader } from "@/app/[lang]/analytics/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { ProductCompareButton } from "@/components/product-compare-button";
import { analyticsApi, productsApi } from "@/lib/api";
import { toProduct } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";
import { formatCompactNumber } from "@/lib/utils";
import type { RoomType, StockStatus } from "@/lib/api/types";

type TileDetailPageProps = { params: Promise<{ id: string }> };

const STOCK_KEYS: Record<StockStatus, string> = {
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
const stockStyles: Record<StockStatus, string> = {
  in_stock: "border-green-200 bg-green-50 text-green-700",
  low_stock: "border-amber/30 bg-white text-amber",
  out_of_stock: "border-red-200 bg-red-50 text-red-700",
};

const getSuitableFor = (suitableFor: "floor" | "wall" | "both") => {
  const badges: { labelKey: string; icon: typeof Layers3 }[] = [];
  if (suitableFor === "floor" || suitableFor === "both") badges.push({ labelKey: "analytics.tileDetail.floor", icon: Layers3 });
  if (suitableFor === "wall" || suitableFor === "both") badges.push({ labelKey: "analytics.tileDetail.wall", icon: Maximize2 });
  return badges;
};

/** Analyst view — read-only: interaction stats + the same product details staff see elsewhere, no edit/action controls. */
const TileDetailPage = ({ params }: TileDetailPageProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = use(params);
  const { data: apiProduct, loading: productLoading, error: productError, reload: reloadProduct } = useApi(
    () => productsApi.get(id),
    [id],
  );
  const { data: rates, loading: ratesLoading, error: ratesError, reload: reloadRates } = useApi(
    () => analyticsApi.tileRates(id),
    [id],
  );

  if (productLoading && !apiProduct) return <ApiLoading label={t("analytics.tileDetail.loading")} className="py-32" />;

  if (productError) {
    if (productError.toLowerCase().includes("not found")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">{t("analytics.tileDetail.notFound")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("analytics.tileDetail.notFoundBody")}</p>
          <Button nativeButton={false} render={<Link href="/analytics/tiles" />} className="mt-6 h-11 gap-2 px-5">
            {t("analytics.tileDetail.back")}
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={productError} onRetry={reloadProduct} className="my-16" />;
  }

  if (!apiProduct) return null;

  const product = toProduct(apiProduct, undefined, locale);
  const currentStock = apiProduct.quantityOnHandSqm ?? 0;
  const breakdown = apiProduct.onHandBreakdown;

  const interactionStats = [
    { key: "views", icon: Eye, label: t("analytics.tileDetail.views"), value: rates ? formatCompactNumber(rates.viewed) : "—" },
    { key: "likes", icon: Heart, label: t("analytics.tileDetail.likes"), value: rates ? formatCompactNumber(rates.saved) : "—" },
    { key: "applications", icon: MousePointerSquareDashed, label: t("analytics.tileDetail.applications"), value: rates ? formatCompactNumber(rates.applied) : "—" },
    { key: "comparisons", icon: GitCompareArrows, label: t("analytics.tileDetail.comparisons"), value: rates ? formatCompactNumber(rates.compared) : "—" },
    { key: "purchases", icon: ShoppingBasket, label: t("analytics.tileDetail.purchases"), value: rates ? formatCompactNumber(rates.purchased) : "—" },
    { key: "selectionRate", icon: MousePointerClick, label: t("analytics.tileDetail.selectionRate"), value: rates ? `${rates.selectionRate.toFixed(1)}%` : "—" },
    { key: "purchaseConversion", icon: Wallet, label: t("analytics.tileDetail.purchaseConversion"), value: rates ? `${rates.purchaseConversion.toFixed(1)}%` : "—" },
  ];

  return (
    <>
      <AnalyticsDetailHeader
        breadcrumbs={[
          { label: t("analytics.tileDetail.crumbDashboard"), href: "/analytics/overview" },
          { label: t("analytics.tileDetail.crumbTiles"), href: "/analytics/tiles" },
          { label: product.name },
        ]}
        title={product.name}
      />

      <div className="space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {ratesLoading && !rates
            ? Array.from({ length: 7 }).map((_, index) => (
                <article key={index} className="flex flex-col rounded-2xl bg-card p-5 sm:p-6">
                  <div className="h-5 w-5 animate-pulse rounded bg-muted-background" />
                  <div className="mt-6 h-3 w-20 animate-pulse rounded bg-muted-background" />
                  <div className="mt-2 h-6 w-16 animate-pulse rounded bg-muted-background" />
                </article>
              ))
            : interactionStats.map(({ key, icon: Icon, label, value }) => (
                <article
                  key={key}
                  className="flex flex-col rounded-2xl bg-card p-5 transition-transform duration-200 active:scale-95 sm:p-6"
                >
                  <Icon
                    className={`size-5 stroke-2 ${key === "likes" ? "fill-red-500 text-red-500" : "text-ink"}`}
                  />
                  <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className={`mt-1 truncate text-xl font-black ${key === "likes" ? "text-red-600" : "text-ink"}`}>
                    {value}
                  </p>
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
                {t("analytics.tileDetail.productStory")}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {product.description || t("analytics.tileDetail.noDescription")}
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
                  {t(STOCK_KEYS[product.stockStatus])}
                </span>
              </div>
              <p className="mt-6 text-2xl font-bold text-ink">
                {product.price.toLocaleString("en-US")} RWF{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {t("analytics.tileDetail.perSqm")}
                </span>
              </p>
              <div className="mt-5 border-b border-slate-100 pb-6">
                <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{t("analytics.tileDetail.currentStockLevel")}</span>
                    <span className="font-data text-xl font-bold text-ink">
                      {currentStock.toLocaleString()} <span className="text-sm font-normal">{t("analytics.common.sqm")}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 py-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("analytics.tileDetail.size")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {product.size}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("analytics.tileDetail.perBox")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {t("analytics.tileDetail.perBoxValue", { coverage: product.boxCoverage, pieces: product.piecesPerBox })}
                  </p>
                </div>
                {breakdown && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("analytics.tileDetail.onHandBoxes")}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Boxes className="size-4" />
                      {t("analytics.tileDetail.onHandBoxesValue", { boxes: breakdown.completeBoxes, pieces: breakdown.remainingPieces })}
                    </p>
                  </div>
                )}
                {apiProduct.averageCostPrice !== undefined && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("analytics.tileDetail.avgCost")}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Package className="size-4" />
                      {Math.round(apiProduct.averageCostPrice).toLocaleString("en-US")} RWF
                    </p>
                  </div>
                )}
              </div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                {t("analytics.tileDetail.suitableFor")}
              </p>
              <div className="flex flex-wrap gap-3">
                {getSuitableFor(product.suitableFor).map(({ labelKey, icon: Icon }) => (
                  <span
                    key={labelKey}
                    className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                  >
                    <Icon className="size-4" />
                    {t(labelKey)}
                  </span>
                ))}
              </div>
              {apiProduct.roomTypes.length > 0 && (
                <>
                  <p className="mt-5 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {t("analytics.tileDetail.roomTypes")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {apiProduct.roomTypes.map((roomType) => (
                      <span
                        key={roomType}
                        className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {ROOM_TYPE_KEYS[roomType] ? t(ROOM_TYPE_KEYS[roomType]) : roomType}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>
            <QuantityCalculator product={product} />
            <ProductCompareButton productId={product.id} />
          </div>
        </div>
      </div>
    </>
  );
};

export default TileDetailPage;
