"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Layers3,
  Maximize2,
  ShoppingCart,
} from "lucide-react";
import { ApiErrorState } from "@/components/api-state";
import { ProductCompareButton } from "@/components/product-compare-button";
import { stockStyles } from "@/components/product-card";
import { ProductDetailSkeleton } from "@/components/skeletons";
import { StaffProductToolbar } from "@/components/staff-toolbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { QuantityCalculator } from "@/components/quantity-calculator";
import {
  eventsApi,
  favoritesApi,
  productsApi,
  toProduct,
  tokenStore,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { useLocale } from "@/lib/i18n";
import { getSessionId } from "@/lib/session-id";
import type { Product } from "@/components/product-card";
import ProductNotFound from "./not-found";

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

/** Product room types arrive as display labels (see `toProduct`); map them back to translation keys. */
const ROOM_LABEL_KEYS = {
  "Living Room (Saloon)": "catalog.roomTypes.livingRoom",
  Bedroom: "catalog.roomTypes.bedroom",
  Bathroom: "catalog.roomTypes.bathroom",
  Kitchen: "catalog.roomTypes.kitchen",
} as const;

const getSuitableForBadges = (suitableFor: Product["suitableFor"]) => {
  const badges: {
    labelKey:
      | "catalog.suitableForOptions.floor"
      | "catalog.suitableForOptions.wall";
    icon: typeof Layers3;
  }[] = [];

  if (suitableFor === "floor" || suitableFor === "both") {
    badges.push({
      labelKey: "catalog.suitableForOptions.floor",
      icon: Layers3,
    });
  }

  if (suitableFor === "wall" || suitableFor === "both") {
    badges.push({
      labelKey: "catalog.suitableForOptions.wall",
      icon: Maximize2,
    });
  }

  return badges;
};

const STOCK_KEYS = {
  in_stock: "product.stock.in_stock",
  low_stock: "product.stock.low_stock",
  out_of_stock: "product.stock.out_of_stock",
} as const;

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

/**
 * Deep-link into the visualizer with this tile already applied. The visualizer
 * reads `?floor=`/`?wall=` (see `visualizer/page.tsx`), so a floor-only tile
 * pre-fills the floor, a wall-only tile the walls, and a "both" tile both.
 */
const visualizerHref = (product: Product) => {
  const params = new URLSearchParams();
  if (product.suitableFor === "floor" || product.suitableFor === "both") {
    params.set("floor", product.id);
  }
  if (product.suitableFor === "wall" || product.suitableFor === "both") {
    params.set("wall", product.id);
  }
  const query = params.toString();
  return query ? `/visualizer?${query}` : "/visualizer";
};

const ProductDetailsPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = use(params);
  const router = useRouter();
  const cart = useCart();
  const { user } = useCurrentUser();
  const isClient = user?.role === "CLIENT";
  const {
    data: apiProduct,
    loading,
    error,
    reload,
  } = useApi(() => productsApi.get(id), [id]);

  // Feeds "Top Viewed Tiles" / Tiles Analytics — fire-and-forget, anonymous-safe
  // (see `events.controller.ts`), and only once the product actually resolves
  // so a 404 or a mistyped id never counts as a view. Also logs the
  // VIEWED_TILE journey stage alongside it — without this, the journey
  // funnel's "Tile Viewed" step counted sessions cumulatively (via a later
  // stage's event crediting backward) but its own drill-down had nothing to
  // show, since no journey event for this exact stage was ever recorded.
  useEffect(() => {
    if (!apiProduct) return;
    const sessionId = getSessionId();
    void eventsApi
      .tile({
        sessionId,
        productId: apiProduct.id,
        type: "VIEWED",
      })
      .catch(() => undefined);
    void eventsApi.journey({ sessionId, stage: "VIEWED_TILE" }).catch(() => undefined);
  }, [apiProduct]);

  const [requiredArea, setRequiredArea] = useState("26");
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // Only worth checking for a signed-in client — favorites are a customer
  // feature, and an anonymous visitor can't have any yet either, so skip the
  // call rather than let it 401 in the background.
  useEffect(() => {
    if (!isClient || !tokenStore.getAccessToken()) return;
    let active = true;
    favoritesApi
      .list()
      .then((favorites) => {
        if (active)
          setIsFavorited(favorites.some((item) => item.productId === id));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, isClient]);

  if (loading) return <ProductDetailSkeleton />;

  if (error) {
    // A deleted or mistyped product id is a 404, not a failure worth retrying.
    if (error.toLowerCase().includes("not found")) return <ProductNotFound />;
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!apiProduct) return <ProductNotFound />;
  const product = toProduct(apiProduct, undefined, locale);

  /** Favorites and cart both need an account — anonymous visitors get sent to sign in instead of a 401. */
  const requireAuth = () => {
    if (tokenStore.getAccessToken()) return true;
    toast.error(t("productDetail.toast.signInRequiredTitle"), {
      description: t("productDetail.toast.signInBody"),
    });
    router.push("/auth");
    return false;
  };

  const toggleFavorite = async () => {
    if (!requireAuth() || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (isFavorited) {
        await favoritesApi.remove(product.id);
        setIsFavorited(false);
        toast.success(t("productDetail.toast.removedFavorite"));
      } else {
        await favoritesApi.add(product.id);
        setIsFavorited(true);
        toast.success(t("productDetail.toast.addedFavorite"));
      }
    } catch (cause) {
      toast.error(t("productDetail.toast.somethingWrong"), {
        description: errorMessage(cause, t("productDetail.toast.tryAgain")),
      });
    } finally {
      setFavoriteBusy(false);
    }
  };

  const addToCart = () => {
    if (!requireAuth()) return;
    const area = Number(requiredArea);
    if (!Number.isFinite(area) || area <= 0) {
      toast.error(t("productDetail.toast.invalidAreaTitle"), {
        description: t("productDetail.toast.invalidAreaBody"),
      });
      return;
    }
    // Updates on screen immediately; the actual save happens in the
    // background (see `useCart`) — no wait, no spinner needed here.
    cart.setQuantity(product, area);
    toast.success(t("productDetail.toast.addedToCartTitle"), {
      description: t("productDetail.toast.addedToCartBody", {
        name: product.name,
        area,
      }),
    });
  };

  return (
    <div className="pb-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> {t("productDetail.back")}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-12">
        <div className="space-y-8">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted-background shadow-sm sm:aspect-4/3 lg:aspect-square">
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
          {product.description && (
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-4 border-b border-slate-100 pb-4 text-xl font-bold text-ink">
                {t("productDetail.productStory")}
              </h2>
              <p className="text-sm leading-6 text-muted">
                {product.description}
              </p>
            </section>
          )}
          {!isClient && user && <StaffProductToolbar role={user.role} product={apiProduct} />}
        </div>

        <div className="space-y-8">
          <section>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {t("productDetail.catalog")} <span className="text-amber">›</span>{" "}
              {product.collection}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-6 flex items-center gap-4 border-b border-slate-200 pb-5">
              <p className="text-2xl font-bold text-ink">
                {formatPrice(product.price)}{" "}
                <span className="text-sm font-medium text-muted">
                  {t("productDetail.pricePerSqm")}
                </span>
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stockStyles[product.stockStatus]}`}
              >
                <Check className="size-3.5" />{" "}
                {t(STOCK_KEYS[product.stockStatus])}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("productDetail.specs.size")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {product.size}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("productDetail.specs.perBox")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {t("productDetail.specs.perBoxValue", {
                    area: product.boxCoverage,
                    pcs: product.piecesPerBox,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("productDetail.specs.sku")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{product.sku}</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              {t("productDetail.suitableFor")}
            </p>
            <div className="flex flex-wrap gap-3">
              {getSuitableForBadges(product.suitableFor).map(
                ({ labelKey, icon: Icon }) => (
                  <span
                    key={labelKey}
                    className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                  >
                    <Icon className="size-4" /> {t(labelKey)}
                  </span>
                ),
              )}
            </div>
            {product.roomTypes.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {t("productDetail.recommendedRooms")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.roomTypes.map((roomType) => {
                    const key =
                      ROOM_LABEL_KEYS[roomType as keyof typeof ROOM_LABEL_KEYS];
                    return (
                      <span
                        key={roomType}
                        className="rounded-full bg-muted-background px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        {key ? t(key) : roomType}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-ink p-7 text-center text-white shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">
              {t("productDetail.visualizer.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-5 text-white/70">
              {t("productDetail.visualizer.body")}
            </p>
            <Button
              nativeButton={false}
              render={<Link href={visualizerHref(product)} />}
              className="group mt-6 h-14 min-h-14 px-7 py-3 font-bold bg-primary text-ink hover:bg-primary/90"
            >
              {t("productDetail.visualizer.cta")}{" "}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </section>

          <QuantityCalculator
            product={product}
            value={requiredArea}
            onChange={setRequiredArea}
          />

          {/* Customer actions stay customer-only; compare remains useful to every role. */}
          <div className={`grid gap-3 ${isClient ? "sm:grid-cols-2" : "max-w-md"}`}>
            {isClient && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void toggleFavorite()}
                disabled={favoriteBusy}
                aria-pressed={isFavorited}
                className="h-16 min-h-16 w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold disabled:opacity-60"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <Heart
                    className={`size-5 text-red-500 ${isFavorited ? "fill-red-500" : ""}`}
                  />
                </span>
                <span className="text-left">
                  <span className="block text-sm">
                    {isFavorited ? t("productDetail.favorited") : t("productDetail.addToFavorites")}
                  </span>
                  <span className="block text-xs font-medium text-muted">
                    {t("productDetail.favoriteHint")}
                  </span>
                </span>
              </Button>
            )}
            {isClient && (
              <Button
                type="button"
                onClick={addToCart}
                className="h-16 min-h-16 w-full justify-start gap-3 rounded-xl bg-primary px-4 py-3 font-bold text-ink hover:bg-primary/90"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/10">
                  <ShoppingCart className="size-5" />
                </span>
                <span className="text-left">
                  <span className="block text-sm">{t("productDetail.addToCart")}</span>
                  <span className="block text-xs font-medium text-ink/65">
                    {t("productDetail.addToCartHint")}
                  </span>
                </span>
              </Button>
            )}
            <ProductCompareButton
              productId={product.id}
              className={isClient ? "sm:col-span-2" : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
