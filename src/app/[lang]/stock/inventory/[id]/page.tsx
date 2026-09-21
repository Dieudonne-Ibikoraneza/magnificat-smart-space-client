"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Boxes, Layers3, Maximize2, Package } from "lucide-react";
import { DashboardDetailHeader as StockDetailHeader } from "@/components/dashboard-page-headers";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { StockLevelPanel } from "@/components/stock-level-panel";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { DeleteProductButton } from "@/components/delete-product-button";
import { ProductCompareButton } from "@/components/product-compare-button";
import { TileAnalyticsSummary } from "@/components/tile-analytics-summary";
import { productsApi } from "@/lib/api";
import { toProduct } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";
import { staffStockDisplay } from "@/lib/stock-display";
import type { RoomType } from "@/lib/api/types";

type StockProductDetailsProps = { params: Promise<{ id: string }> };

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

const getSuitableFor = (suitableFor: "floor" | "wall" | "both") => {
  const badges: { labelKey: string; icon: typeof Layers3 }[] = [];
  if (suitableFor === "floor" || suitableFor === "both") badges.push({ labelKey: "stock.inventoryDetail.floor", icon: Layers3 });
  if (suitableFor === "wall" || suitableFor === "both") badges.push({ labelKey: "stock.inventoryDetail.wall", icon: Maximize2 });
  return badges;
};

const StockProductDetailsPage = ({ params }: StockProductDetailsProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = use(params);
  const { data: apiProduct, loading, error, reload } = useApi(() => productsApi.get(id), [id]);

  if (loading && !apiProduct) return <ApiLoading label={t("stock.inventoryDetail.loading")} className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">{t("stock.inventoryDetail.notFound")}</h1>
          <Button nativeButton={false} render={<Link href="/stock/inventory" />} className="mt-6 h-11 gap-2 px-5">
            {t("stock.inventoryDetail.backToInventory")}
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!apiProduct) return null;

  const product = toProduct(apiProduct, undefined, locale);
  const stock = staffStockDisplay(apiProduct);
  const currentStock = stock.quantityOnHandSqm;
  const breakdown = apiProduct.onHandBreakdown;

  return (
    <>
      <StockDetailHeader
        breadcrumbs={[
          { label: t("stock.inventoryDetail.crumbOverview"), href: "/stock/overview" },
          { label: t("stock.inventoryDetail.crumbInventory"), href: "/stock/inventory" },
          { label: product.name },
        ]}
        title={product.name}
      />

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
          <TileAnalyticsSummary productId={product.id} />
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="border-b border-slate-100 pb-4 text-xl font-bold text-ink">
              {t("stock.inventoryDetail.productStory")}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {product.description || t("stock.inventoryDetail.noDescription")}
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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stock.badge}`}
              >
                {t(`staff.stockStatus.${stock.status}`)}
              </span>
            </div>
            <p className="mt-6 text-2xl font-bold text-ink">
              {product.price.toLocaleString("en-US")} RWF{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {t("stock.inventoryDetail.perSqm")}
              </span>
            </p>
            <div className="mt-5 border-b border-slate-100 pb-6">
              <StockLevelPanel
                productId={product.id}
                productName={product.name}
                currentStockSqm={currentStock}
                reservedAreaSqm={stock.reservedAreaSqm}
                onAdjusted={reload}
              />
            </div>
            <div className="grid grid-cols-2 gap-5 py-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("stock.inventoryDetail.size")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {product.size}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("stock.inventoryDetail.perBox")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {t("stock.inventoryDetail.perBoxValue", { coverage: product.boxCoverage, pieces: product.piecesPerBox })}
                </p>
              </div>
              {breakdown && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("stock.inventoryDetail.onHandBoxes")}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                    <Boxes className="size-4" />
                    {t("stock.inventoryDetail.onHandBoxesValue", { boxes: breakdown.completeBoxes, pieces: breakdown.remainingPieces })}
                  </p>
                </div>
              )}
              {apiProduct.averageCostPrice !== undefined && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("stock.inventoryDetail.avgCost")}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                    <Package className="size-4" />
                    {Math.round(apiProduct.averageCostPrice).toLocaleString("en-US")} RWF
                  </p>
                </div>
              )}
            </div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {t("stock.inventoryDetail.suitableFor")}
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
                  {t("stock.inventoryDetail.roomTypes")}
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
          <section className="space-y-3 rounded-2xl bg-card p-4 sm:p-5">
            <ProductCompareButton productId={product.id} />
            <div className="grid grid-cols-2 gap-3">
              <EditProductDialog product={apiProduct} onUpdated={reload} />
              <DeleteProductButton productId={product.id} productName={product.name} redirectTo="/stock/inventory" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default StockProductDetailsPage;
