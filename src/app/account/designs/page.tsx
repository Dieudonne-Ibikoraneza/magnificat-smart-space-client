"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Layers3,
  Ruler,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toast";
import {
  getDesignProducts,
  savedDesigns,
  type SavedDesign,
} from "@/data/room-designs";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

/**
 * Designs the customer saved from the 3D visualizer (doc 3.5: "the client can
 * save their accepted design to their account for later reference or to share
 * with the sales team"). Sharing is a per-design toggle, so a customer can keep
 * some work private and hand others to sales for a quotation.
 */
const DesignCard = ({
  design,
  onToggleShare,
  onDelete,
}: {
  design: SavedDesign;
  onToggleShare: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const tiles = getDesignProducts(design);
  const estimate = tiles.reduce(
    (total, tile) => total + (design.areaSqm / tiles.length / tile.product.boxCoverage) * tile.product.price,
    0,
  );

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
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
        {design.sharedWithSales && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-green-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            <Users className="size-3" /> Shared
          </span>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-ink">{design.name}</h2>
        <p className="mt-1 text-xs text-muted">Saved {design.savedAt}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <Ruler className="size-3" /> Area
            </dt>
            <dd className="mt-1 font-data font-semibold text-ink">{design.areaSqm} m²</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <Layers3 className="size-3" /> Surfaces
            </dt>
            <dd className="mt-1 font-data font-semibold text-ink">{design.tiles.length}</dd>
          </div>
        </dl>

        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {tiles.map((tile) => (
            <li key={tile.surface} className="flex items-center gap-3">
              <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                <Image src={tile.product.image} alt="" fill unoptimized className="object-cover" sizes="36px" />
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/products/${tile.product.id}`}
                  className="block truncate text-sm font-semibold text-ink hover:underline"
                >
                  {tile.product.name}
                </Link>
                <span className="block text-xs text-muted">
                  {tile.surface} · {tile.product.size}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="text-muted">Estimated materials</span>
          <span className="font-data font-bold text-ink">{formatRWF(estimate)}</span>
        </p>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onToggleShare(design.id)}
            className={cn("h-10 gap-2 text-xs font-bold", design.sharedWithSales && "border-ink")}
          >
            <Share2 className="size-3.5" />
            {design.sharedWithSales ? "Stop sharing" : "Share with sales"}
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/visualizer?design=${design.id}`} />}
            className="group h-10 gap-2 bg-primary text-xs font-bold text-ink hover:bg-primary/90"
          >
            Open in visualizer
            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>

        <ConfirmDialog
          title="Delete this design?"
          description={`"${design.name}" will be removed from your account. This cannot be undone.`}
          confirmLabel="Delete design"
          onConfirm={() => onDelete(design.id)}
          trigger={
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
            >
              <Trash2 className="size-3.5" /> Delete design
            </button>
          }
        />
      </div>
    </article>
  );
};

export default function AccountDesignsPage() {
  const [designs, setDesigns] = useState(savedDesigns);

  const toggleShare = (id: string) => {
    let nowShared = false;
    setDesigns((current) =>
      current.map((design) => {
        if (design.id !== id) return design;
        nowShared = !design.sharedWithSales;
        return { ...design, sharedWithSales: nowShared };
      }),
    );
    toast.success(nowShared ? "Design shared with sales" : "Sharing turned off", {
      description: nowShared
        ? "Our sales team can now see this design and prepare a quotation for it."
        : "This design is private to your account again.",
    });
  };

  const remove = (id: string) => {
    setDesigns((current) => current.filter((design) => design.id !== id));
    toast.success("Design deleted");
  };

  return (
    <div className="pb-10">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Saved designs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Rooms you styled in the 3D visualizer. Share one with our sales team and they&apos;ll turn it
          into a quotation with the exact quantities you need.
        </p>
      </header>

      {designs.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-ink">
            <Sparkles className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">No saved designs yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Try tiles on a real room in the 3D visualizer, then save the ones you like to come back to
            them later.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/visualizer" />}
            className="mt-6 h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
          >
            Open the 3D visualizer <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} onToggleShare={toggleShare} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
