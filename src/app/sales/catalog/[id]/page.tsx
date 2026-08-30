"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers3, Maximize2 } from "lucide-react";
import { SalesPageHeader } from "@/app/sales/layout";
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
import { productsApi } from "@/lib/api";
import { toProduct, roomTypeLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import type { StockStatus } from "@/lib/api/types";

type SalesProductDetailsProps = { params: Promise<{ id: string }> };

const formatPrice = (value: number) => `RWF ${value.toLocaleString("en-US")}`;

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

const SalesProductDetailsPage = ({ params }: SalesProductDetailsProps) => {
  const { id } = use(params);
  const { data: apiProduct, loading, error, reload } = useApi(() => productsApi.get(id), [id]);

  if (loading && !apiProduct) return <ApiLoading label="Loading product…" className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">Product not found</h1>
          <Button nativeButton={false} render={<Link href="/sales/catalog" />} className="mt-6 h-11 gap-2 px-5">
            Back to Catalog
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!apiProduct) return null;

  const product = toProduct(apiProduct);

  return (
    <>
      <SalesPageHeader title={product.name} subtitle="Product details and quantity planning." />

      <div className="mt-5 border-b border-border pb-5 sm:mt-6 sm:pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/sales/overview" />}>
                Overview
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/sales/catalog" />}>
                Catalog
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
            <p className="mt-6 border-b border-slate-200 pb-5 text-2xl font-bold text-ink">
              {formatPrice(product.price)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / sqm
              </span>
            </p>
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
    </>
  );
};

export default SalesProductDetailsPage;
