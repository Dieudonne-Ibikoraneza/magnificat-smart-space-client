"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Expand, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { productsApi, tokenStore } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { toProduct } from "@/lib/api/mappers";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  ChatRecommendation,
  ChatRecommendationWallProduct,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type ChatProductCardProps = { product: ChatRecommendation };

/** Either the floor tile (the full recommendation) or its paired wall tile — the two shapes share every field a tile-info row needs. */
type SurfaceTile = ChatRecommendation | ChatRecommendationWallProduct;

export const ChatProductCard = ({ product }: ChatProductCardProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const cart = useCart();
  const router = useRouter();
  const { user } = useCurrentUser();
  const isClient = user?.role === "CLIENT";

  /**
   * The recommendation only carries a compact view of the product — real
   * cart lines need the full record (box coverage, pieces/box, etc.), so
   * this fetches it on demand rather than bloating every chat turn with
   * full product payloads most replies never need adding to cart. Takes the
   * specific tile (floor or, for a bathroom combo, wall) being added, since
   * one card can offer either.
   */
  const handleAddToCart = async (tile: SurfaceTile) => {
    if (!tokenStore.getAccessToken()) {
      toast.error(t("chatCard.toast.signInRequiredTitle"), {
        description: t("chatCard.toast.signInBody"),
      });
      router.push("/auth");
      return;
    }
    setAddingId(tile.id);
    try {
      const apiProduct = await productsApi.get(tile.id);
      const fullProduct = toProduct(apiProduct, tile.collection, locale);
      const existing = cart.lines.find(
        (line) => line.productId === fullProduct.id,
      );
      const nextArea =
        Math.round(((existing?.areaSqm ?? 0) + fullProduct.boxCoverage) * 100) /
        100;
      cart.setQuantity(fullProduct, nextArea);
      toast.success(t("chatCard.toast.addedTitle"), {
        description: t("chatCard.toast.addedBody", {
          name: fullProduct.name,
          area: nextArea,
        }),
      });
    } catch (cause) {
      toast.error(t("chatCard.toast.addFailedTitle"), {
        description:
          cause instanceof ApiError ? cause.message : t("dash.tryAgain"),
      });
    } finally {
      setAddingId(null);
    }
  };

  const cartButton = (
    tile: SurfaceTile,
    size: "size-10" | "size-8" | "size-7",
    iconSize: "size-4" | "size-3.5" | "size-3",
  ) =>
    isClient && (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={addingId === tile.id}
        onClick={() => void handleAddToCart(tile)}
        aria-label={t("chatCard.addToCartAria", { name: tile.name })}
        className={cn(
          size,
          "shrink-0 rounded-full border border-slate-100 bg-muted-background text-ink hover:bg-primary disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {addingId === tile.id ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <ShoppingCart className={iconSize} />
        )}
      </Button>
    );

  /** The full-size layout for a card recommending a single tile — unchanged from before the bathroom floor+wall combo existed. */
  const renderSingleTile = (tile: SurfaceTile) => (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d5c19f]">
        {tile.collection} · {tile.size}
      </p>
      <h3 className="mt-1 truncate text-xs font-bold text-ink">{tile.name}</h3>
      <p className="mt-2 text-base font-bold text-ink">
        RWF {tile.price.toLocaleString()}{" "}
        <span className="ml-1 text-[11px] font-medium text-muted">
          {t("chatCard.perSqm")}
        </span>
      </p>
      <div className="mt-3 flex items-center gap-2">
        {cartButton(tile, "size-10", "size-4")}
        <Link
          href={tile.link}
          className="group/button flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90"
        >
          {t("chatCard.viewDetails")}{" "}
          <ArrowUpRight className="size-4 transition-transform group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );

  /**
   * A bathroom combo's floor and wall tile are two products but one
   * recommendation — a single compact row each, side by side under one
   * shared "Perfect pairing" heading, rather than two full stacked card
   * bodies that looked like two unrelated recommendations glued together.
   * There's no room left in a row this compact for the tile's name — a
   * hover/focus tooltip on the whole row surfaces it instead, so nothing's
   * lost, just not shown inline.
   */
  const renderComboRow = (
    tile: SurfaceTile,
    surfaceLabel: string,
    isFloor: boolean,
  ) => (
    <Tooltip>
      <TooltipTrigger
        render={<div className="flex items-center gap-2 py-2.5" tabIndex={0} />}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide",
            isFloor
              ? "bg-[#f3ead9] text-[#8a6d3b]"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {surfaceLabel}
        </span>
        <span className="min-w-0 flex-1" aria-hidden="true" />
        <p className="shrink-0 text-xs font-bold text-ink">
          RWF {tile.price.toLocaleString()}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {cartButton(tile, "size-7", "size-3")}
          <Link
            href={tile.link}
            aria-label={t("chatCard.viewDetailsAria", { name: tile.name })}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-ink transition-colors hover:bg-primary/90"
          >
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {t(isFloor ? "chatCard.floorTooltip" : "chatCard.wallTooltip", {
          name: tile.name,
        })}
      </TooltipContent>
    </Tooltip>
  );

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
        <button
          type="button"
          onClick={() => setIsFullScreen(true)}
          aria-label={t("chatCard.viewFullScreenAria", { name: product.name })}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-ink/70 text-white shadow-sm transition hover:bg-ink"
        >
          <Expand className="size-4" />
        </button>
        <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm">
          {t("chatCard.match", { score: Math.round(product.matchScore) })}
        </span>
        <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
          {t("chatCard.aiRoomViz")}
        </span>
      </div>
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl bg-ink p-2 sm:p-3" showClose>
          <DialogTitle className="sr-only">
            {t("chatCard.vizTitle", { name: product.name })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("chatCard.vizDescription")}
          </DialogDescription>
          <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden rounded-xl bg-black">
            {/* Data URLs returned by Gemini are intentionally rendered without Next image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={t("chatCard.vizImageAlt", { name: product.name })}
              className="max-h-[85vh] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
      {product.wallProduct ? (
        <div className="px-3 pb-3">
          <p className="pt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("chatCard.perfectPairing")}
          </p>
          <div className="divide-y divide-slate-100">
            {renderComboRow(product, t("chatCard.floorTile"), true)}
            {renderComboRow(product.wallProduct, t("chatCard.wallTile"), false)}
          </div>
        </div>
      ) : (
        <div className="p-3">{renderSingleTile(product)}</div>
      )}
    </article>
  );
};
