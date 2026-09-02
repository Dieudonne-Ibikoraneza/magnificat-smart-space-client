"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/lib/cart-store";
import { productsApi, tokenStore } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { toProduct } from "@/lib/api/mappers";
import type { ChatRecommendation } from "@/lib/api/types";

type ChatProductCardProps = { product: ChatRecommendation };

export const ChatProductCard = ({ product }: ChatProductCardProps) => {
  const [adding, setAdding] = useState(false);
  const cart = useCart();
  const router = useRouter();

  /**
   * The recommendation only carries a compact view of the product — real
   * cart lines need the full record (box coverage, pieces/box, etc.), so
   * this fetches it on demand rather than bloating every chat turn with
   * full product payloads most replies never need adding to cart.
   */
  const handleAddToCart = async () => {
    if (!tokenStore.getAccessToken()) {
      toast.error("Sign in required", {
        description: "Create a free account or log in to add tiles to your cart.",
      });
      router.push("/auth");
      return;
    }
    setAdding(true);
    try {
      const apiProduct = await productsApi.get(product.id);
      const fullProduct = toProduct(apiProduct, product.collection);
      const existing = cart.lines.find((line) => line.productId === fullProduct.id);
      const nextArea = Math.round(((existing?.areaSqm ?? 0) + fullProduct.boxCoverage) * 100) / 100;
      cart.setQuantity(fullProduct, nextArea);
      toast.success("Added to cart", { description: `${fullProduct.name} — now ${nextArea} m² in your cart.` });
    } catch (cause) {
      toast.error("Couldn't add to cart", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="relative aspect-[1.1/1] overflow-hidden bg-muted-background">
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          className="object-cover"
        />
        <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm">
          {Math.round(product.matchScore)}% Match
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Save ${product.name}`}
          className="absolute right-2 top-2 size-8 rounded-full border-white/80 bg-white/90 p-0 text-muted hover:bg-white"
        >
          <Heart className="size-4" />
        </Button>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d5c19f]">
          {product.collection} · {product.size}
        </p>
        <h3 className="mt-1 truncate text-xs font-bold text-ink">
          {product.name}
        </h3>
        {product.reason && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted" title={product.reason}>
            {product.reason}
          </p>
        )}
        <p className="mt-2 text-base font-bold text-ink">
          RWF {product.price.toLocaleString()}{" "}
          <span className="ml-1 text-[11px] font-medium text-muted">/ sqm</span>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={adding}
            onClick={() => void handleAddToCart()}
            aria-label={`Add ${product.name} to cart`}
            className="size-10 shrink-0 rounded-full border border-slate-100 bg-muted-background text-ink hover:bg-primary disabled:pointer-events-none disabled:opacity-60"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
          </Button>
          <Link
            href={product.link}
            className="group/button flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            View Details{" "}
            <ArrowUpRight className="size-4 transition-transform group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
