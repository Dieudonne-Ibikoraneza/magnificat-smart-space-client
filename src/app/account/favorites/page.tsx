"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Eye, Heart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { products } from "@/data/catalog";
import { Button } from "@/components/ui/button";

type Tab = "products" | "designs";

const savedDesigns = [
  { id: "living-room", name: "My Living Room", date: "JUN 30TH, 2026", image: "/showroom.jpg" },
  { id: "kitchen", name: "My Kitchen", date: "JUN 29TH, 2026", image: "/showroom.jpg" },
  { id: "bedroom", name: "My Bedroom", date: "JUN 27TH, 2026", image: "https://images.unsplash.com/photo-1616486338812-3dadai4?auto=format&fit=crop&w=900&q=85" },
];

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const FavoritesPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [favoriteIds, setFavoriteIds] = useState(() => products.slice(0, 4).map((product) => product.id));

  const favoriteProducts = useMemo(
    () => products.filter((product) => favoriteIds.includes(product.id)),
    [favoriteIds],
  );

  const removeFavorite = (id: string) => {
    setFavoriteIds((current) => current.filter((favoriteId) => favoriteId !== id));
  };

  return (
    <div className="mx-auto max-w-300">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">
            Your Favorites <span className="font-normal">({favoriteProducts.length || 0} items)</span>
          </h1>
          <p className="mt-1 text-sm text-ink">
            {activeTab === "products" ? "Track and manage your favorite products and saved designs" : "Keep your favorite spaces close and ready to revisit"}
          </p>
        </div>
        <div className="flex w-fit rounded-lg bg-muted-background p-1 text-sm">
          <button type="button" onClick={() => setActiveTab("products")} className={`rounded-md px-4 py-2.5 font-semibold transition-colors ${activeTab === "products" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            Favorite Products
          </button>
          <button type="button" onClick={() => setActiveTab("designs")} className={`rounded-md px-4 py-2.5 font-semibold transition-colors ${activeTab === "designs" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            Saved Designs
          </button>
        </div>
      </div>

      {activeTab === "products" ? (
        <div className="space-y-4">
          {favoriteProducts.length > 0 ? favoriteProducts.map((product) => (
            <article key={product.id} className="group relative flex flex-col gap-5 rounded-3xl bg-white p-5 sm:flex-row sm:gap-8 sm:p-6 lg:px-8">
              <Link href={`/products/${product.id}`} className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl sm:size-56" aria-label={`View ${product.name}`}>
                <Image src={product.image} alt={product.name} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="224px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#d4c09e]">{product.collection} · {product.size}</p>
                    <h2 className="mt-1 text-lg font-bold text-ink">{product.name}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button nativeButton={false} render={<Link href={`/products/${product.id}`} />} type="button" variant="ghost" size="icon" className="size-9 text-ink hover:bg-muted-background" aria-label="View product"><ExternalLink className="size-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFavorite(product.id)} className="size-9 text-red-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${product.name} from favorites`}><Trash2 className="size-5" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink">
                  <span className="rounded-xl bg-muted-background px-4 py-3"><strong>Size:</strong> {product.size}</span>
                  <span className="rounded-xl bg-muted-background px-4 py-3"><strong>Finish:</strong> Polished</span>
                </div>
                <div className="mt-auto flex flex-col gap-4 pt-7 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-sm uppercase text-muted">Price</p><p className="text-2xl font-bold text-ink">{formatPrice(product.price)}</p></div>
                  <Button nativeButton={false} render={<Link href="/account/cart" />} className="h-11 justify-between gap-6 px-5 text-sm font-bold">Add to Cart <ArrowRight className="size-5" /></Button>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-3xl bg-white px-6 py-16 text-center"><Heart className="mx-auto size-8 text-muted" /><h2 className="mt-4 font-bold text-ink">No favorite products yet</h2><p className="mt-1 text-sm text-muted">Save products you love to find them here.</p></div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedDesigns.map((design) => (
            <article key={design.id} className="overflow-hidden rounded-2xl bg-white">
              <div className="relative aspect-[1.65/1]">
                <Image src={design.image} alt={design.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 size-10 rounded-full bg-white text-red-500 shadow-sm hover:bg-white hover:text-red-600" aria-label={`Delete ${design.name}`}><Trash2 className="size-5" /></Button>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-ink">{design.name}</h2>
                <p className="mt-1 text-sm font-medium uppercase text-muted">Saved {design.date}</p>
                <Button nativeButton={false} render={<Link href="/visualizer" />} className="mt-5 h-11 w-full justify-between px-5 text-sm font-bold">View in Visualizer <Eye className="size-5" /></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
