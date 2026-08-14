"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Layers3,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { products } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { QuantityCalculator } from "@/components/quantity-calculator";
import type { Product } from "@/components/product-card";

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const stockLabels = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const stockBadgeStyles = {
  in_stock: "border-green-200 bg-green-50 text-green-700",
  low_stock: "border-amber/30 bg-white text-amber",
  out_of_stock: "border-red-200 bg-red-50 text-red-700",
};

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

const detailSpecs = [
  { label: "Finish", value: "Polished", icon: Sparkles },
  { label: "Material", value: "Porcelain", icon: Layers3 },
];

const ProductDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const product = products.find((item) => item.id === id) ?? products[0];
  const [saved, setSaved] = useState(false);

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
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 border-b border-slate-100 pb-4 text-xl font-bold text-ink">Product Story</h2>
            <p className="text-sm leading-6 text-muted">Inspired by the timeless quarries of Italy, our <strong className="text-ink">Carrara White Polished Marble</strong> series brings a sense of expansive luxury to any interior. This porcelain reproduction captures the essence of natural stone with none of the maintenance.</p>
            <p className="mt-4 text-sm leading-6 text-muted">Ideal for high-traffic living areas, sophisticated bathrooms, or sleek kitchen floors. Precision-cut to ensure minimal grout lines.</p>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">Catalog <span className="text-amber">›</span> 60×60cm Floor Tile</p>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{product.name}</h1>
            <div className="mt-6 flex items-center gap-4 border-b border-slate-200 pb-5">
              <p className="text-2xl font-bold text-ink">{formatPrice(product.price)} <span className="text-sm font-medium text-muted">/ m²</span></p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${stockBadgeStyles[product.stockStatus]}`}>
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
              {detailSpecs.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{value}</p>
                </div>
              ))}
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
          </section>

          <section className="rounded-2xl bg-ink p-7 text-center text-white shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">See it in your room</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-5 text-white/70">Use our AI-powered 3D visualizer to see how these tiles look in your space before you buy.</p>
            <Button className="group mt-6 h-14 min-h-14 px-7 py-3 font-bold bg-primary text-ink hover:bg-primary/90">Start Visualizing <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" /></Button>
          </section>

          <QuantityCalculator product={product} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" className="h-14 min-h-14 w-full gap-3 py-3 font-bold bg-primary text-ink hover:bg-primary/90" onClick={() => setSaved((value) => !value)} aria-pressed={saved}>
              <Bookmark className={saved ? "fill-current" : ""} /> {saved ? "Saved Product" : "Save Product"}
            </Button>
            <Button type="button" className="group h-14 min-h-14 w-full gap-3 py-3 font-bold bg-primary text-ink hover:bg-primary/90">
              Place Order <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
