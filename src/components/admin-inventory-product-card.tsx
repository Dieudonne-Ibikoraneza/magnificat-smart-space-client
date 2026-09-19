"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TileAnalyticsSummary } from "@/components/tile-analytics-summary";
import type { ApiProduct } from "@/lib/api/types";
import { staffStockDisplay } from "@/lib/stock-display";
import { cn } from "@/lib/utils";

export const AdminInventoryProductCard = ({
  product,
  basePath = "/admin/inventory",
}: {
  product: ApiProduct;
  basePath?: string;
}) => {
  const { t } = useTranslation();
  const status = staffStockDisplay(product);
  const quantity = status.quantityOnHandSqm;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,39,71,0.10)]">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-b-3xl bg-muted-background">
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <span
          className={cn(
            "absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
            status.badge,
          )}
        >
          <span className={cn("size-2 rounded-full", status.dot)} />
          {t(`staff.stockStatus.${status.status}`)}
        </span>
        <Link
          href={`${basePath}/${product.id}`}
          aria-label={t("stock.inventory.openDetailsAria", { name: product.name })}
          className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-105 hover:bg-white"
        >
          <ArrowUpRight className="size-5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.size} • {product.sku}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">{product.name}</h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description || t("stock.inventory.noDescription")}
        </p>
        <TileAnalyticsSummary productId={product.id} variant="compact" className="mt-3" />

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className={cn("text-xl font-bold", status.quantity)}>
            {quantity.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">{t("stock.inventory.sqm")}</span>
          </p>
          <Button
            type="button"
            nativeButton={false}
            render={<Link href={`${basePath}/${product.id}`} />}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
          >
            <Eye className="size-3.5" /> {t("stock.inventory.view")}
          </Button>
        </div>
      </div>
    </article>
  );
};
