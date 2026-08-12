import Image from "next/image";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Product = {
  id: string;
  name: string;
  collection: string;
  size: string;
  price: number;
  image: string;
  description: string;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
};

const stockStyles = {
  in_stock: "bg-green-50 text-green-700 border-green-200",
  low_stock: "bg-white/90 text-amber border-amber/30",
  out_of_stock: "bg-red-50 text-red-700 border-red-200",
};

const stockLabels = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export const ProductCard = ({
  product,
  list = false,
}: {
  product: Product;
  list?: boolean;
}) => {
  return (
    <article
      className={`group relative flex overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(15,39,71,0.10)] ${list ? "flex-col sm:flex-row" : "flex-col"}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden bg-muted-background ${list ? "aspect-[16/10] w-full sm:aspect-square sm:w-60" : "aspect-square w-full rounded-b-3xl"}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          priority={product.id === "1"}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={list ? "(max-width: 640px) 100vw, 240px" : "(max-width: 768px) 100vw, 33vw"}
        />
        <span
          className={`absolute left-4 top-4 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm ${stockStyles[product.stockStatus]}`}
        >
          <span className="mr-1.5">•</span>
          {stockLabels[product.stockStatus]}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 size-9 rounded-full bg-white/90 text-ink shadow-sm hover:bg-white hover:text-ink"
          aria-label={`Save ${product.name}`}
        >
          <Heart className="size-5" />
        </Button>
      </div>
      <div
        className={`flex flex-1 flex-col p-5 sm:p-6 ${list ? "justify-center" : ""}`}
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#d4c09e]">
          {product.collection} • {product.size}
        </p>
        <h2 className={`${list ? "text-lg" : "text-base"} mb-1 font-bold text-ink`}>{product.name}</h2>
        <p className="line-clamp-2 text-sm leading-5 text-muted">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 sm:pt-6">
          <p className="text-lg font-bold text-ink">
            RWF {product.price.toLocaleString()}{" "}
            <span className="ml-1 text-xs font-normal text-muted">/ sqm</span>
          </p>
          <Button
            size="icon"
            variant="ghost"
            className="size-11 rounded-full border border-slate-100 bg-muted-background text-ink hover:bg-primary hover:text-ink"
            aria-label={`View ${product.name}`}
          >
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </div>
    </article>
  );
};
