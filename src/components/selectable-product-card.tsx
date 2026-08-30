"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ChartNoAxesColumn, Pencil, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryProduct } from "@/data/inventory";

const statusStyles = {
  in_stock: {
    label: "In stock",
    dot: "bg-green-500",
    badge: "border-green-200 bg-green-50 text-green-700",
    quantity: "text-ink",
  },
  low_stock: {
    label: "Low stock",
    dot: "bg-amber-500",
    badge: "border-amber/30 bg-white/95 text-amber",
    quantity: "text-amber-600",
  },
  out_of_stock: {
    label: "Out of stock",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-700",
    quantity: "text-red-600",
  },
} as const;

/**
 * The mock-data inventory card used by the (still-mock, deferred) "New
 * Order" item picker on admin/stock — split out from the inventory list
 * pages so those could move to real data (ApiProduct) without needing this
 * one, still-mock, selectable variant to move with them.
 */
export const SelectableInventoryProductCard = ({
  product,
  basePath,
  selectable = false,
  selected = false,
  onToggle,
}: {
  product: InventoryProduct;
  basePath: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) => {
  const status = statusStyles[product.stockStatus];

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,39,71,0.10)]",
        selectable && selected && "ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-b-3xl bg-muted-background">
        <Image
          src={product.image}
          alt={product.displayName}
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
          {status.label}
        </span>

        {selectable ? (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            aria-label={selected ? `Remove ${product.displayName} from order` : `Select ${product.displayName}`}
            className={cn(
              "absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105",
              selected ? "bg-primary text-ink" : "bg-white/95 text-transparent hover:bg-white",
            )}
          >
            <Check className="size-5" strokeWidth={2.5} />
          </button>
        ) : (
          <Link
            href={`${basePath}/${product.id}`}
            aria-label={`Open ${product.displayName} inventory details`}
            className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-105 hover:bg-white"
          >
            <ArrowUpRight className="size-5" strokeWidth={2.25} />
          </Link>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/35 via-ink/10 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
          <div className="flex items-center justify-between gap-3 rounded-full bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,39,71,0.18)] backdrop-blur-sm sm:px-4 sm:py-3">
            <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold tracking-tight text-ink uppercase sm:text-xs">
              <ChartNoAxesColumn className="size-4 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{product.views} Views</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold tracking-wide text-green-600 uppercase sm:text-[11px]">
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
              {product.rate} Rate
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.collection} • {product.size}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">
          {product.displayName}
        </h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className={cn("text-xl font-bold", status.quantity)}>
            {product.quantity.toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">sqm</span>
          </p>

          {!selectable && (
            <div className="flex items-center overflow-hidden rounded-full bg-primary shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none text-ink hover:bg-white/45"
                aria-label={`Edit ${product.displayName}`}
              >
                <Pencil className="size-4" strokeWidth={2.25} />
              </Button>
              <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none text-ink hover:bg-white/45 hover:text-red-600"
                aria-label={`Delete ${product.displayName}`}
              >
                <Trash2 className="size-4" strokeWidth={2.25} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
