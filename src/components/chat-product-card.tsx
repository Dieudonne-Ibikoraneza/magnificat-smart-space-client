import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatRecommendation } from "@/lib/api/types";

type ChatProductCardProps = { product: ChatRecommendation };

export const ChatProductCard = ({ product }: ChatProductCardProps) => (
  <article className="overflow-hidden rounded-xl bg-white shadow-sm">
    <div className="relative aspect-[1.1/1] overflow-hidden bg-muted-background">
      <Image
        src={product.image}
        alt={product.name}
        fill
        unoptimized
        className="object-cover"
      />
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
      <p className="mt-3 text-base font-bold text-ink">
        RWF {product.price.toLocaleString()}{" "}
        <span className="ml-1 text-[11px] font-medium text-muted">/ sqm</span>
      </p>
      <Link
        href={product.link}
        className="group/button mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90"
      >
        View Details{" "}
        <ArrowUpRight className="size-4 transition-transform group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
      </Link>
    </div>
  </article>
);
