"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiProduct, StockStatus } from "@/lib/api/types";

const statusStyles: Record<StockStatus, { label: string; dot: string; badge: string; quantity: string }> = {
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
};

/**
 * Real-product (`ApiProduct`) card used by the staff "New Order" item picker —
 * a toggle-to-select variant of `AdminInventoryProductCard`, since that one
 * links out to the inventory detail page instead of selecting.
 */
export const SelectableProductCard = ({
  product,
  selected = false,
  onToggle,
}: {
  product: ApiProduct;
  selected?: boolean;
  onToggle?: () => void;
}) => {
  const status = statusStyles[product.stockStatus];
  const quantity = product.quantityOnHandSqm ?? 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,39,71,0.10)]",
        selected && "ring-2 ring-primary",
      )}
    >
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
          {status.label}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${product.name} from order` : `Select ${product.name}`}
          className={cn(
            "absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105",
            selected ? "bg-primary text-ink" : "bg-white/95 text-transparent hover:bg-white",
          )}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-[#C0A786] uppercase">
          {product.size} • {product.sku}
        </p>
        <h2 className="mb-1 text-base font-bold text-ink sm:text-xl">{product.name}</h2>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {product.description || "No description yet."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <p className={cn("text-xl font-bold", status.quantity)}>
            {quantity.toLocaleString()} <span className="text-sm font-medium text-muted">sqm</span>
          </p>
        </div>
      </div>
    </article>
  );
};
