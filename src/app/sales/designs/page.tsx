"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Layers3, Mail, Phone, Search, Sparkles, Users } from "lucide-react";
import { SalesPageHeader } from "@/app/sales/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roomsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { ApiRoomDesign } from "@/lib/api/types";

/**
 * Designs a customer styled in the 3D visualizer and explicitly shared with
 * the sales team (doc 3.5) — real data from `GET /rooms/designs/shared`
 * (staff-only), which already carries who shared it (`design.user`) and
 * exactly what they chose (`design.room`, `design.tiles`). This page was
 * disabled and mocked before (see git history) with no way to see either the
 * shared design or the customer behind it — this replaces that entirely.
 */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const SURFACE_KEYS: Record<string, string> = {
  FLOOR: "sales.designs.surfaceFloor",
  WALL: "sales.designs.surfaceWalls",
};

const DesignCard = ({ design }: { design: ApiRoomDesign }) => {
  const { t } = useTranslation();
  const preview = design.previewImageUrl || design.room?.thumbnail || "/showroom.jpg";
  const tiles = design.tiles.flatMap((tile) =>
    tile.product ? [{ surface: tile.surface, product: toProduct(tile.product, tile.product.collection?.title) }] : [],
  );

  return (
    <article className="overflow-hidden rounded-2xl bg-card">
      <div className="relative aspect-[16/10] bg-muted-background">
        <Image
          src={preview}
          alt={t("sales.designs.previewAlt", { name: design.name })}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {design.room?.name && (
          <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink backdrop-blur-sm">
            {design.room.name}
          </span>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-ink">{design.name}</h2>

        {design.user && (
          <Link
            href={`/sales/customers/${design.user.id}`}
            className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink hover:underline"
          >
            <Users className="size-3.5" /> {design.user.fullName}
          </Link>
        )}
        {design.user?.email && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3.5" /> {design.user.email}
          </p>
        )}
        {design.user?.phone && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3.5" /> {design.user.phone}
          </p>
        )}

        <p className="mt-2 text-xs text-muted-foreground">{t("sales.designs.shared", { date: formatDate(design.createdAt) })}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <Layers3 className="size-3" /> {t("sales.designs.surfaces")}
            </dt>
            <dd className="mt-1 font-data font-semibold text-ink">{design.tiles.length}</dd>
          </div>
        </dl>

        {tiles.length > 0 && (
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
                    {SURFACE_KEYS[tile.surface] ? t(SURFACE_KEYS[tile.surface]) : tile.surface}
                    {tile.product.size ? ` · ${tile.product.size}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button
          nativeButton={false}
          render={<Link href={design.user ? `/sales/orders/new?customer=${design.user.id}` : "/sales/orders/new"} />}
          className="group mt-5 h-10 w-full gap-2 text-xs font-bold"
        >
          {t("sales.designs.startOrder")}
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </article>
  );
};

/** Shared designs come from `GET /rooms/designs/shared` — see `src/lib/api/endpoints.ts`. */
export default function SalesDesignsPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi(() => roomsApi.sharedDesigns());
  const designs = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return designs;
    return designs.filter(
      (design) =>
        design.name.toLowerCase().includes(term) ||
        (design.room?.name ?? "").toLowerCase().includes(term) ||
        (design.user?.fullName ?? "").toLowerCase().includes(term) ||
        (design.user?.email ?? "").toLowerCase().includes(term),
    );
  }, [designs, search]);

  return (
    <div className="pb-10">
      <SalesPageHeader
        title={t("sales.designs.title")}
        subtitle={t("sales.designs.subtitle")}
      />

      <div className="relative mt-6 max-w-md">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("sales.designs.searchPlaceholder")}
          aria-label={t("sales.designs.searchAria")}
          className="h-11 rounded-lg pl-10 text-sm"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <ApiLoading label={t("sales.designs.loading")} className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : designs.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-ink">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-ink">{t("sales.designs.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {t("sales.designs.emptyBody")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <ApiEmptyState message={t("sales.designs.noSearchResults")} className="py-16" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
