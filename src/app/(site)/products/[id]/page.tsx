"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Layers3,
  Maximize2,
  Scale,
  ShoppingCart,
} from "lucide-react";
import { ApiErrorState } from "@/components/api-state";
import { stockLabels, stockStyles } from "@/components/product-card";
import { ProductDetailSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { QuantityCalculator } from "@/components/quantity-calculator";
import { favoritesApi, productsApi, toProduct, tokenStore } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { useCart } from "@/lib/cart-store";
import type { Product } from "@/components/product-card";
import ProductNotFound from "./not-found";

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const getSuitableForBadges = (suitableFor: Product["suitableFor"]) => {
  const badges: { label: string; icon: typeof Layers3 }[] = [];

  if (suitableFor === "floor" || suitableFor === "both") {
    badges.push({ label: "Floor", icon: Layers3 });
  }

  if (suitableFor === "wall" || suitableFor === "both") {
    badges.push({ label: "Wall", icon: Maximize2 });
  }

  return badges;
};

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const ProductDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const cart = useCart();
  const { data: apiProduct, loading, error, reload } = useApi(() => productsApi.get(id), [id]);

  const [requiredArea, setRequiredArea] = useState("26");
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // Only worth checking for a signed-in visitor — an anonymous one can't have
  // favorites yet, so skip the call rather than let it 401 in the background.
  useEffect(() => {
    if (!tokenStore.getAccessToken()) return;
    let active = true;
    favoritesApi
      .list()
      .then((favorites) => {
        if (active) setIsFavorited(favorites.some((item) => item.productId === id));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <ProductDetailSkeleton />;

  if (error) {
    // A deleted or mistyped product id is a 404, not a failure worth retrying.
    if (error.toLowerCase().includes("not found")) return <ProductNotFound />;
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!apiProduct) return <ProductNotFound />;
  const product = toProduct(apiProduct);

  /** Favorites and cart both need an account — anonymous visitors get sent to sign in instead of a 401. */
  const requireAuth = () => {
    if (tokenStore.getAccessToken()) return true;
    toast.error("Sign in required", {
      description: "Create a free account or log in to save favorites and build your cart.",
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
        toast.success("Removed from favorites");
      } else {
        await favoritesApi.add(product.id);
        setIsFavorited(true);
        toast.success("Added to favorites");
      }
    } catch (cause) {
      toast.error("Something went wrong", { description: errorMessage(cause, "Please try again.") });
    } finally {
      setFavoriteBusy(false);
    }
  };

  const addToCart = () => {
    if (!requireAuth()) return;
    const area = Number(requiredArea);
    if (!Number.isFinite(area) || area <= 0) {
      toast.error("Enter a valid area", {
        description: "Set the area you need in the calculator below before adding to cart.",
      });
      return;
    }
    // Updates on screen immediately; the actual save happens in the
    // background (see `useCart`) — no wait, no spinner needed here.
    cart.setQuantity(product, area);
    toast.success("Added to cart", { description: `${product.name} — ${area} m² is in your cart.` });
  };

  return (
    <div className="pb-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-4" /> Back to Catalog
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-12">
        <div className="space-y-8">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted-background shadow-sm sm:aspect-[4/3] lg:aspect-square">
            <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" />
          </div>
          {product.description && (
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-4 border-b border-slate-100 pb-4 text-xl font-bold text-ink">Product Story</h2>
              <p className="text-sm leading-6 text-muted">{product.description}</p>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">Catalog <span className="text-amber">›</span> {product.size}</p>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{product.name}</h1>
            <div className="mt-6 flex items-center gap-4 border-b border-slate-200 pb-5">
              <p className="text-2xl font-bold text-ink">{formatPrice(product.price)} <span className="text-sm font-medium text-muted">/ sqm</span></p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stockStyles[product.stockStatus]}`}>
                <Check className="size-3.5" /> {stockLabels[product.stockStatus]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Size</p>
                <p className="mt-1 text-sm font-bold text-ink">{product.size}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Per box</p>
                <p className="mt-1 text-sm font-bold text-ink">{product.boxCoverage} m² ({product.piecesPerBox} pcs)</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">SKU</p>
                <p className="mt-1 text-sm font-bold text-ink">{product.sku}</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Suitable for</p>
            <div className="flex flex-wrap gap-3">
              {getSuitableForBadges(product.suitableFor).map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                >
                  <Icon className="size-4" /> {label}
                </span>
              ))}
            </div>
            {product.roomTypes.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide text-muted">Recommended rooms</p>
                <div className="flex flex-wrap gap-2">
                  {product.roomTypes.map((roomType) => (
                    <span
                      key={roomType}
                      className="rounded-full bg-muted-background px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      {roomType}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-ink p-7 text-center text-white shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">See it in your room</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-5 text-white/70">Use our AI-powered 3D visualizer to see how these tiles look in your space before you buy.</p>
            <Button nativeButton={false} render={<Link href="/visualizer" />} className="group mt-6 h-14 min-h-14 px-7 py-3 font-bold bg-primary text-ink hover:bg-primary/90">Start Visualizing <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" /></Button>
          </section>

          <QuantityCalculator product={product} value={requiredArea} onChange={setRequiredArea} />

          {/* The only three actions this page offers: save it, cart it, or compare it. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void toggleFavorite()}
              disabled={favoriteBusy}
              aria-pressed={isFavorited}
              className="h-14 min-h-14 w-full gap-2 py-3 font-bold disabled:opacity-60"
            >
              <Heart className={isFavorited ? "fill-red-500 text-red-500" : ""} />
              {isFavorited ? "Favorited" : "Add to Favorites"}
            </Button>
            <Button
              type="button"
              onClick={addToCart}
              className="h-14 min-h-14 w-full gap-2 py-3 font-bold bg-primary text-ink hover:bg-primary/90"
            >
              <ShoppingCart className="size-5" /> Add to Cart
            </Button>
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/compare?ids=${product.id}`} />}
              className="h-14 min-h-14 w-full gap-2 py-3 font-bold"
            >
              <Scale className="size-5" /> Compare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
