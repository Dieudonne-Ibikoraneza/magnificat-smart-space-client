"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Matches `ProductCard`'s shape — image, kicker, title, description, price row. */
export const ProductCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-3xl bg-white">
    <Skeleton className="aspect-square w-full rounded-none rounded-b-3xl" />
    <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-auto flex items-center justify-between pt-4 sm:pt-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="size-11 rounded-full" />
      </div>
    </div>
  </div>
);

/** Same grid classes as `ProductCatalog`'s card grid, so the swap-in is seamless. */
export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

/** One expanded accordion group in `FilterOptionsCard` — a label plus its
 * checkbox rows, sized to match the real `size-5` checkbox + `text-sm` label. */
const FilterGroupSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="border-b border-slate-100 py-4 first:pt-0 last:border-b-0">
    <Skeleton className="h-4 w-28" />
    <div className="mt-4 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ))}
    </div>
  </div>
);

/** Matches `ProductCatalog`'s full layout — the `xl:w-72` filter sidebar (the
 * same white `rounded-2xl` panel `FilterOptionsCard` renders into), the
 * toolbar (results count, sort, view toggle, search), and the card grid — so
 * the swap-in on `/` doesn't jump the page around once real content lands. */
export const ProductsPageSkeleton = () => (
  <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="rounded-2xl bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <FilterGroupSkeleton rows={7} />
        <FilterGroupSkeleton rows={3} />
        <FilterGroupSkeleton rows={2} />
      </div>
    </aside>

    <section className="min-w-0 flex-1">
      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-[72px] rounded-lg" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
      <ProductGridSkeleton count={6} />
    </section>
  </div>
);

/** Matches the collections page's dark, image-filled `CollectionCard`. */
export const CollectionCardSkeleton = () => (
  <div className="relative flex min-h-[390px] flex-col justify-end overflow-hidden rounded-3xl bg-muted-background p-6 sm:p-7">
    <Skeleton className="absolute inset-0 rounded-3xl" />
    <div className="relative z-10 space-y-3">
      <Skeleton className="h-6 w-2/3 bg-white/40" />
      <Skeleton className="h-4 w-full bg-white/25" />
      <Skeleton className="h-10 w-36 rounded-lg bg-white/40" />
    </div>
  </div>
);

/** Matches the collections page's dark intro banner (heading, copy, CTA, side image). */
export const CollectionsBannerSkeleton = () => (
  <div className="relative overflow-hidden rounded-3xl bg-ink px-7 py-12 sm:px-12 sm:py-16 lg:px-20 lg:py-20">
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-8 w-52 rounded-full bg-white/10" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md bg-white/20" />
        <Skeleton className="h-10 w-40 bg-white/20" />
      </div>
      <Skeleton className="h-4 w-full max-w-xl bg-white/10" />
      <Skeleton className="h-4 w-2/3 max-w-xl bg-white/10" />
      <Skeleton className="h-14 w-56 rounded-lg bg-white/20" />
    </div>
    <div className="relative mt-10 aspect-square overflow-hidden rounded-3xl sm:absolute sm:right-10 sm:top-1/2 sm:mt-0 sm:w-[31%] sm:-translate-y-1/2 lg:right-20 lg:w-[28%]">
      <Skeleton className="absolute inset-0 rounded-3xl bg-white/10" />
    </div>
  </div>
);

export const CollectionGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <CollectionCardSkeleton key={index} />
    ))}
  </div>
);

/** Matches `/products/[id]`'s two-column layout. */
export const ProductDetailSkeleton = () => (
  <div className="pb-6">
    <Skeleton className="mb-6 h-5 w-32" />
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-12">
      <div className="space-y-8">
        <Skeleton className="aspect-square w-full rounded-3xl sm:aspect-[4/3] lg:aspect-square" />
        <div className="space-y-3 rounded-2xl bg-white p-6 sm:p-8">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <div className="space-y-8">
        <div>
          <Skeleton className="mb-4 h-3 w-40" />
          <Skeleton className="h-9 w-3/4" />
          <div className="mt-6 flex items-center gap-4 border-b border-slate-200 pb-5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-6 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="mb-2 h-3 w-24" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

/** Matches `/account/cart`'s line-item + order-summary layout. */
export const CartSkeleton = () => (
  <div className="max-w-360 mx-auto">
    <div className="mb-5 flex items-center justify-between">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="grid overflow-hidden rounded-2xl bg-white sm:grid-cols-[220px_minmax(0,1fr)]"
          >
            <Skeleton className="aspect-[1.35/1] w-full rounded-none sm:aspect-auto sm:min-h-64" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-9 w-40 rounded-lg" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  </div>
);

/** Matches `/compare`'s side-by-side table + tile picker layout. */
export const CompareSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
    <div className="space-y-4 rounded-2xl bg-white p-6">
      <div className="flex gap-4">
        <Skeleton className="aspect-square w-40 rounded-xl" />
        <Skeleton className="aspect-square w-40 rounded-xl" />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </div>
    <div className="space-y-3 rounded-2xl bg-white p-5">
      <Skeleton className="h-10 w-full rounded-full" />
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
