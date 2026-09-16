"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers3, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { roomsApi, toProduct } from "@/lib/api";
import { localizedText } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";
import type { ApiRoomDesign } from "@/lib/api/types";

const SURFACE_KEYS = { FLOOR: "dash.designs.surface.floor", WALL: "dash.designs.surface.wall" } as const;

/**
 * Designs the customer saved from the 3D visualizer (doc 3.5: "the client can
 * save their accepted design to their account for later reference or to share
 * with the sales team"). Read-only: the backend has no update or delete route
 * for a saved design, and sharing is chosen at save time in the visualizer
 * (`POST /rooms/designs`), so this page just lists what's already there.
 */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const DesignCard = ({ design }: { design: ApiRoomDesign }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const preview = design.previewImageUrl || design.room?.thumbnail || "/showroom.jpg";
  const tiles = design.tiles.flatMap((tile) =>
    tile.product ? [{ surface: tile.surface, product: toProduct(tile.product, undefined, locale) }] : [],
  );
  const roomName = design.room ? localizedText(design.room.name, design.room.nameRw, locale) : null;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="relative aspect-[16/10] bg-muted-background">
        <Image
          src={preview}
          alt={t("dash.designs.previewAlt", { name: design.name })}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {roomName && (
          <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink backdrop-blur-sm">
            {roomName}
          </span>
        )}
        {design.sharedWithSales && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-green-600/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            <Users className="size-3" /> {t("dash.designs.shared")}
          </span>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-ink">{design.name}</h2>
        <p className="mt-1 text-xs text-muted">{t("dash.designs.savedOn", { date: formatDate(design.createdAt) })}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <Layers3 className="size-3" /> {t("dash.designs.surfaces")}
            </dt>
            <dd className="mt-1 font-data font-semibold text-ink">{design.tiles.length}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <Users className="size-3" /> {t("dash.designs.sharedWithSales")}
            </dt>
            <dd className="mt-1 font-data font-semibold text-ink">{design.sharedWithSales ? t("dash.designs.yes") : t("dash.designs.no")}</dd>
          </div>
        </dl>

        {tiles.length > 0 && (
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
                    {(() => {
                      const k = SURFACE_KEYS[tile.surface as keyof typeof SURFACE_KEYS];
                      return k ? t(k) : tile.surface;
                    })()}
                    {tile.product.size ? ` · ${tile.product.size}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button
          nativeButton={false}
          render={<Link href={`/visualizer?design=${design.id}`} />}
          className="group mt-5 h-10 w-full gap-2 bg-primary text-xs font-bold text-ink hover:bg-primary/90"
        >
          {t("dash.designs.openInVisualizer")}
          <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </article>
  );
};

/** Saved designs come from `GET /rooms/designs/mine` — see `src/lib/api/endpoints.ts`. */
export default function AccountDesignsPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi(() => roomsApi.myDesigns());
  const designs = data ?? [];

  return (
    <div className="pb-10">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("dash.designs.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t("dash.designs.subtitle")}
        </p>
      </header>

      {loading && <ApiLoading label={t("dash.designs.loading")} />}

      {!loading && error && <ApiErrorState message={error} onRetry={reload} />}

      {!loading && !error && designs.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-ink">
            <Sparkles className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">{t("dash.designs.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {t("dash.designs.emptyBody")}
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/visualizer" />}
            className="mt-6 h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
          >
            {t("dash.designs.openVisualizer")} <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {!loading && !error && designs.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      )}
    </div>
  );
}
