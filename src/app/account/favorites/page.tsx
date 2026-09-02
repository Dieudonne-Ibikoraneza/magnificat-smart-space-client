"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { favoritesApi, toProduct } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { Product } from "@/components/product-card";

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const suitableForText: Record<Product["suitableFor"], string> = {
  floor: "Floor",
  wall: "Walls",
  both: "Floor & walls",
};

/** Favorites come from `GET /favorites` — see `src/lib/api/endpoints.ts`. */
const FavoritesPage = () => {
  const { data, loading, error, reload } = useApi(() => favoritesApi.list());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const favorites = (data ?? []).map((row) => toProduct(row.product, row.product.collection?.title));

  const removeFavorite = async (productId: string) => {
    setRemovingId(productId);
    try {
      await favoritesApi.remove(productId);
      toast.success("Removed from favorites");
      reload();
    } catch (cause) {
      toast.error("Couldn't remove that", { description: errorMessage(cause, "Please try again.") });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-300">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">
          Your Favorites{" "}
          <span className="font-normal">
            ({favorites.length} {favorites.length === 1 ? "item" : "items"})
          </span>
        </h1>
        <p className="mt-1 text-sm text-ink">Track and manage the products you saved.</p>
      </div>

      {loading && <ApiLoading label="Loading your favorites…" />}

      {!loading && error && <ApiErrorState message={error} onRetry={reload} />}

      {!loading && !error && favorites.length === 0 && (
        <div className="rounded-3xl bg-white px-6 py-16 text-center">
          <Heart className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 font-bold text-ink">No favorite products yet</h2>
          <p className="mt-1 text-sm text-muted">Save products you love to find them here.</p>
          <Button
            nativeButton={false}
            render={<Link href="/" />}
            className="mt-6 h-11 gap-2 px-5 text-sm font-bold"
          >
            Browse the catalog <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {!loading && !error && favorites.length > 0 && (
        <div className="space-y-4">
          {favorites.map((product) => (
            <article
              key={product.id}
              className="group relative flex flex-col gap-5 rounded-3xl bg-white p-5 sm:flex-row sm:gap-8 sm:p-6 lg:px-8"
            >
              <Link
                href={`/products/${product.id}`}
                className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl sm:size-56"
                aria-label={`View ${product.name}`}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="224px"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#d4c09e]">
                      {product.collection} · {product.size}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-ink">{product.name}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      nativeButton={false}
                      render={<Link href={`/products/${product.id}`} />}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-ink hover:bg-muted-background"
                      aria-label="View product"
                    >
                      <ExternalLink className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={removingId === product.id}
                      onClick={() => removeFavorite(product.id)}
                      className="size-9 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${product.name} from favorites`}
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink">
                  <span className="rounded-xl bg-muted-background px-4 py-3">
                    <strong>Size:</strong> {product.size}
                  </span>
                  <span className="rounded-xl bg-muted-background px-4 py-3">
                    <strong>Suitable for:</strong> {suitableForText[product.suitableFor]}
                  </span>
                </div>
                <div className="mt-auto flex flex-col gap-4 pt-7 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm uppercase text-muted">Price</p>
                    <p className="text-2xl font-bold text-ink">{formatPrice(product.price)}</p>
                  </div>
                  <Button
                    nativeButton={false}
                    render={<Link href={`/products/${product.id}`} />}
                    className="h-11 justify-between gap-6 px-5 text-sm font-bold"
                  >
                    View product <ArrowRight className="size-5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
