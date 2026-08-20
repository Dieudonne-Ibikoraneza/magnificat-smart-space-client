import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ClipboardCheck,
  Layers3,
  Maximize2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import type { Product } from "@/components/product-card";
import { products } from "@/data/catalog";

type StockProductDetailsProps = { params: Promise<{ id: string }> };
const stockQuantities: Record<string, number> = {
  "1": 1240,
  "2": 45,
  "3": 0,
  "4": 0,
  "5": 45,
  "6": 45,
};
const stockLabels = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
} as const;
const stockStyles = {
  in_stock: "border-green-200 bg-green-50 text-green-700",
  low_stock: "border-amber/30 bg-white text-amber",
  out_of_stock: "border-red-200 bg-red-50 text-red-700",
} as const;

const getSuitableFor = (suitableFor: Product["suitableFor"]) => {
  const badges: { label: string; icon: typeof Layers3 }[] = [];
  if (suitableFor === "floor" || suitableFor === "both")
    badges.push({ label: "Floor", icon: Layers3 });
  if (suitableFor === "wall" || suitableFor === "both")
    badges.push({ label: "Wall", icon: Maximize2 });
  return badges;
};

export const generateMetadata = async ({
  params,
}: StockProductDetailsProps): Promise<Metadata> => {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  return {
    title: product ? `${product.name} | Inventory` : "Product | Inventory",
  };
};

const StockProductDetailsPage = async ({
  params,
}: StockProductDetailsProps) => {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  const currentStock = stockQuantities[product.id] ?? 0;
  return (
    <>
      <header className="border-b border-border pb-5 sm:pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/stock/overview" />}>
                Overview
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/stock/inventory" />}>
                Inventory
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-ink sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Product details and inventory controls.
            </p>
          </div>
        </div>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
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
              {product.description}
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Ideal for high-traffic living areas, sophisticated bathrooms, or
              sleek kitchen floors. Precision-cut to ensure minimal grout lines.
            </p>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wider text-muted uppercase">
                  {product.collection} • {product.size}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
                  {product.name}
                </h2>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stockStyles[product.stockStatus]}`}
              >
                <Check className="size-3.5" />
                {stockLabels[product.stockStatus]}
              </span>
            </div>
            <p className="mt-6 pb-5 text-2xl font-bold text-ink">
              {product.price.toLocaleString("en-US")} RWF{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / sqm
              </span>
            </p>
            <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">
                  Current Stock Level
                </span>
                <span className="font-data text-xl font-bold text-ink">
                  {currentStock.toLocaleString()}{" "}
                  <span className="text-sm font-normal">boxes</span>
                </span>
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
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Finish
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Sparkles className="size-4" />
                  Polished
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Material
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Layers3 className="size-4" />
                  Porcelain
                </p>
              </div>
            </div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Suitable for
            </p>
            <div className="flex flex-wrap gap-3">
              {getSuitableFor(product.suitableFor).map(
                ({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                  >
                    <Icon className="size-4" />
                    {label}
                  </span>
                ),
              )}
            </div>
          </section>
          <QuantityCalculator product={product} />
          <Button type="button" className="h-13 w-full gap-2 rounded-lg text-sm font-bold">
            <ClipboardCheck className="size-5" />
            Adjust Stock
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 font-semibold border border-[#E8E8E8] text-sm"
            >
              <Pencil className="size-4 stroke-2.5" />
              Edit Details
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-12 gap-2 font-semibold text-sm"
            >
              <Trash2 className="size-4 stroke-2.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StockProductDetailsPage;
