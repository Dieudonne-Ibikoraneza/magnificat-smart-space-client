"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Expand, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/lib/cart-store";
import { productsApi, tokenStore } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { toProduct } from "@/lib/api/mappers";
import type { ChatRecommendation } from "@/lib/api/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type ChatProductCardProps = { product: ChatRecommendation };

export const ChatProductCard = ({ product }: ChatProductCardProps) => {
  const [adding, setAdding] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
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
        <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" />
        <button
          type="button"
          onClick={() => setIsFullScreen(true)}
          aria-label={`View ${product.name} visualization full screen`}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-ink/70 text-white shadow-sm transition hover:bg-ink"
        >
          <Expand className="size-4" />
        </button>
        <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm">
          {Math.round(product.matchScore)}% Match
        </span>
        <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
          AI room visualization
        </span>
      </div>
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl bg-ink p-2 sm:p-3" showClose>
          <DialogTitle className="sr-only">{product.name} room visualization</DialogTitle>
          <DialogDescription className="sr-only">
            AI-generated room visualization showing the recommended tile.
          </DialogDescription>
          <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden rounded-xl bg-black">
            {/* Data URLs returned by Gemini are intentionally rendered without Next image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={`${product.name} AI room visualization`} className="max-h-[85vh] w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d5c19f]">
          {product.collection} · {product.size}
        </p>
        <h3 className="mt-1 truncate text-xs font-bold text-ink">
          {product.name}
        </h3>
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
