"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Layers3, Maximize2 } from "lucide-react";
import { DashboardPageHeader as SalesPageHeader } from "@/components/dashboard-page-headers";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { ProductCompareButton } from "@/components/product-compare-button";
import { productsApi } from "@/lib/api";
import { toProduct } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";
import type { RoomType, StockStatus } from "@/lib/api/types";

type SalesProductDetailsProps = { params: Promise<{ id: string }> };

const formatPrice = (value: number) => `RWF ${value.toLocaleString("en-US")}`;

const STOCK_KEYS = {
  in_stock: "staff.stockStatus.in_stock",
  low_stock: "staff.stockStatus.low_stock",
  out_of_stock: "staff.stockStatus.out_of_stock",
} as const;

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
  if (suitableFor === "floor" || suitableFor === "both") badges.push({ labelKey: "sales.catalogDetail.floor", icon: Layers3 });
  if (suitableFor === "wall" || suitableFor === "both") badges.push({ labelKey: "sales.catalogDetail.wall", icon: Maximize2 });
  return badges;
};

const SalesProductDetailsPage = ({ params }: SalesProductDetailsProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = use(params);
  const { data: apiProduct, loading, error, reload } = useApi(() => productsApi.get(id), [id]);

  if (loading && !apiProduct) return <ApiLoading label={t("sales.catalogDetail.loading")} className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">{t("sales.catalogDetail.notFound")}</h1>
          <Button nativeButton={false} render={<Link href="/sales/catalog" />} className="mt-6 h-11 gap-2 px-5">
            {t("sales.catalogDetail.backToCatalog")}
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!apiProduct) return null;

  const product = toProduct(apiProduct, undefined, locale);

  return (
    <>
      <SalesPageHeader title={product.name} subtitle={t("sales.catalogDetail.subtitle")} />

      <div className="mt-5 border-b border-border pb-5 sm:mt-6 sm:pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/sales/overview" />}>
                {t("sales.catalogDetail.crumbOverview")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/sales/catalog" />}>
                {t("sales.catalogDetail.crumbCatalog")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="space-y-6">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted-background sm:aspect-[4/3] lg:aspect-square">
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
              {t("sales.catalogDetail.productStory")}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {product.description || t("sales.catalogDetail.noDescription")}
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
            <p className="mt-6 border-b border-slate-200 pb-5 text-2xl font-bold text-ink">
              {formatPrice(product.price)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {t("sales.catalogDetail.perSqm")}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-5 py-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("sales.catalogDetail.size")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {product.size}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("sales.catalogDetail.perBox")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {t("sales.catalogDetail.perBoxValue", { coverage: product.boxCoverage, pieces: product.piecesPerBox })}
                </p>
              </div>
            </div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {t("sales.catalogDetail.suitableFor")}
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
                  {t("sales.catalogDetail.roomTypes")}
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
    </>
  );
};

export default SalesProductDetailsPage;
