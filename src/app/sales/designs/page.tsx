import { notFound } from "next/navigation";

// Disabled — Shared Designs is commented out (nav item too, see
// src/app/sales/layout.tsx) rather than deleted, so it's easy to bring
// back later. Everything below the original page.

/*
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileText, Layers3, Ruler, Search, Users } from "lucide-react";
import { SalesPageHeader } from "@/app/sales/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { getDesignProducts, sharedDesigns } from "@/data/room-designs";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

/**
 * Designs customers shared with the sales team from the 3D visualizer (doc 3.5).
 * Each one already carries the room, the surfaces and the tiles chosen, so it
 * converts straight into a draft order without re-asking the customer.
 *//*
export default function SalesDesignsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sharedDesigns;
    return sharedDesigns.filter(
      (design) =>
        design.name.toLowerCase().includes(term) ||
        design.roomName.toLowerCase().includes(term) ||
        (design.customerName ?? "").toLowerCase().includes(term),
    );
  }, [search]);

  return (
    <div className="pb-10">
      <SalesPageHeader
        title="Shared Designs"
        subtitle="Rooms customers designed and shared with you for a quotation."
      />

      <div className="relative mt-6 max-w-md">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by customer, room or design name..."
          aria-label="Search shared designs"
          className="h-11 rounded-lg pl-10 text-sm"
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((design) => {
          const tiles = getDesignProducts(design);
          const estimate = tiles.reduce(
            (total, tile) =>
              total + (design.areaSqm / tiles.length / tile.product.boxCoverage) * tile.product.price,
            0,
          );

          return (
            <article key={design.id} className="overflow-hidden rounded-2xl bg-card">
              <div className="relative aspect-[16/10] bg-muted-background">
                <Image
                  src={design.previewImage}
                  alt={`Preview of ${design.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink backdrop-blur-sm">
                  {design.roomName}
                </span>
              </div>

              <div className="p-5">
                <h2 className="text-base font-bold text-ink">{design.name}</h2>
                {design.customerName && (
                  <Link
                    href={`/sales/customers/${design.customerSlug}`}
                    className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink hover:underline"
                  >
                    <Users className="size-3.5" /> {design.customerName}
                  </Link>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Shared {design.savedAt}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Ruler className="size-3" /> Area
                    </dt>
                    <dd className="mt-1 font-data font-semibold text-ink">{design.areaSqm} m²</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Layers3 className="size-3" /> Surfaces
                    </dt>
                    <dd className="mt-1 font-data font-semibold text-ink">{design.tiles.length}</dd>
                  </div>
                </dl>

                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  {tiles.map((tile) => (
                    <li key={tile.surface} className="flex items-center gap-3">
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        <Image src={tile.product.image} alt="" fill unoptimized className="object-cover" sizes="36px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/sales/catalog/${tile.product.id}`}
                          className="block truncate text-sm font-semibold text-ink hover:underline"
                        >
                          {tile.product.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {tile.surface} · {tile.product.size}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">Estimated materials</span>
                  <span className="font-data font-bold text-ink">{formatRWF(estimate)}</span>
                </p>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      toast.success("Quotation drafted", {
                        description: `Materials from "${design.name}" are ready to review on a new order.`,
                      })
                    }
                    className="h-10 gap-2 text-xs font-bold"
                  >
                    <FileText className="size-3.5" /> Draft quotation
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<Link href="/sales/orders/new" />}
                    className="group h-10 gap-2 text-xs font-bold"
                  >
                    Create order
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            No shared designs match that search.
          </p>
        )}
      </div>
    </div>
  );
}
*/

export default function SalesDesignsPage() {
  notFound();
}
