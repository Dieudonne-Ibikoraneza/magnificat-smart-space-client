"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calculator,
  Check,
  Layers3,
  Maximize2,
  Ruler,
  Sparkles,
  SquareStack,
} from "lucide-react";
import { products } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { label: "Size", value: "60×60 cm", icon: Ruler },
  { label: "Finish", value: "Polished", icon: Sparkles },
  { label: "Material", value: "Porcelain", icon: Layers3 },
  { label: "Per box", value: "1.44 m² (4 pcs)", icon: SquareStack },
];

const ProductDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const product = products.find((item) => item.id === id) ?? products[0];
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("12");
  const [waste, setWaste] = useState(true);
  const [saved, setSaved] = useState(false);

  const calculation = useMemo(() => {
    const area = Number(length) * Number(width) || 0;
    const adjustedArea = area * (waste ? 1.1 : 1);
    const boxes = Math.ceil(adjustedArea / 1.44);
    return { area: adjustedArea, boxes, total: boxes * product.price * 1.44 };
  }, [length, width, waste, product.price]);

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
              {detailSpecs.slice(1).map(({ label, value }) => (
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

          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-2"><Calculator className="size-5 text-ink" /><h2 className="text-lg font-bold text-ink">Quantity Calculator</h2></div>
            <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-muted">Length (m)<Input value={length} onChange={(event) => setLength(event.target.value)} inputMode="decimal" className="mt-2 h-12 text-base font-semibold" /></label><label className="text-xs font-medium uppercase tracking-wide text-muted">Width (m)<Input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="decimal" className="mt-2 h-12 text-base font-semibold" /></label></div>
            <div className="mt-6 flex items-center justify-between border-b border-slate-100 pb-6">
              <div>
                <p className="text-sm font-medium text-muted">Wastage allowance</p>
                <p className="text-sm text-ink">10% Recommended</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={waste}
                aria-label="Toggle wastage allowance"
                onClick={() => setWaste((value) => !value)}
                className={`relative h-7 w-16 shrink-0 rounded-full p-0 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f63e8] focus-visible:ring-offset-2 ${waste ? "bg-primary" : "bg-slate-200"}`}
              >
                <span
                  className={`absolute left-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#2f63e8] text-white shadow-md transition-transform duration-300 ease-out ${waste ? "translate-x-7" : "translate-x-0"}`}
                >
                  <Check
                    className={`size-[18px] transition-opacity duration-200 ${waste ? "opacity-100" : "opacity-0"}`}
                    strokeWidth={3}
                  />
                </span>
              </button>
            </div>
            <dl className="space-y-4 pt-6 text-sm"><div className="flex justify-between"><dt className="text-muted">Total area</dt><dd className="font-bold text-ink">{calculation.area.toFixed(2)} m²</dd></div><div className="flex justify-between"><dt className="text-muted">Boxes needed</dt><dd className="font-bold text-ink">{calculation.boxes}</dd></div><div className="flex items-center justify-between pt-2"><dt className="text-base font-bold text-ink">Total price</dt><dd className="text-xl font-bold text-ink">{formatPrice(calculation.total)}</dd></div></dl>
          </section>

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
