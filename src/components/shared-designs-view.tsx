"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Layers3, Loader2, Mail, Phone, Search, Sparkles, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-headers";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roomsApi, toProduct } from "@/lib/api";
import { localizedText } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLocale } from "@/lib/i18n";
import type { ApiRoomDesign } from "@/lib/api/types";

/**
 * Which dashboard is rendering the list — every link inside a card has to
 * stay inside that role's own area (each role's routes are gated to it, see
 * `auth-routes.ts`), and each area has its own copy of the strings under
 * `<area>.designs.*`.
 */
export type SharedDesignsArea = "sales" | "admin" | "stock";

const AREA_ROUTES: Record<
  SharedDesignsArea,
  { customer: (id: string) => string; product: (id: string) => string; newOrder: string }
> = {
  sales: {
    customer: (id) => `/sales/customers/${id}`,
    product: (id) => `/sales/catalog/${id}`,
    newOrder: "/sales/orders/new",
  },
  admin: {
    customer: (id) => `/admin/customers/${id}`,
    product: (id) => `/admin/inventory/${id}`,
    newOrder: "/admin/orders/new",
  },
  stock: {
    customer: (id) => `/stock/customers/${id}`,
    product: (id) => `/stock/inventory/${id}`,
    newOrder: "/stock/orders/new",
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const DesignCard = ({ design, area }: { design: ApiRoomDesign; area: SharedDesignsArea }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const routes = AREA_ROUTES[area];
  const k = (key: string) => `${area}.designs.${key}`;
  const preview = design.previewImageUrl || design.room?.thumbnail || "/showroom.jpg";
  const tiles = design.tiles.flatMap((tile) =>
    tile.product ? [{ surface: tile.surface, product: toProduct(tile.product, undefined, locale) }] : [],
  );
  const roomName = design.room ? localizedText(design.room.name, design.room.nameRw, locale) : null;
  const surfaceLabel = (surface: string) =>
    surface === "FLOOR" ? t(k("surfaceFloor")) : surface === "WALL" ? t(k("surfaceWalls")) : surface;

  return (
    <article className="overflow-hidden rounded-2xl bg-card">
      <div className="relative aspect-[16/10] bg-muted-background">
        <Image
          src={preview}
          alt={t(k("previewAlt"), { name: design.name })}
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
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-ink">{design.name}</h2>

        {design.user && (
          <Link
            href={routes.customer(design.user.id)}
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

        <p className="mt-2 text-xs text-muted-foreground">{t(k("shared"), { date: formatDate(design.createdAt) })}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <Layers3 className="size-3" /> {t(k("surfaces"))}
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
                    href={routes.product(tile.product.id)}
                    className="block truncate text-sm font-semibold text-ink hover:underline"
                  >
                    {tile.product.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {surfaceLabel(tile.surface)}
                    {tile.product.size ? ` · ${tile.product.size}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button
          nativeButton={false}
          render={<Link href={design.user ? `${routes.newOrder}?customer=${design.user.id}` : routes.newOrder} />}
          className="group mt-5 h-10 w-full gap-2 text-xs font-bold"
        >
          {t(k("startOrder"))}
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </article>
  );
};

/** Designs per page — each one carries its tiles, products and owner, so pages stay small. */
const PAGE_SIZE = 12;

/**
 * Designs a customer styled in the 3D visualizer and explicitly shared with
 * the sales team (doc 3.5) — real data from `GET /rooms/designs/shared`
 * (staff-only: admin, sales and stock manager), which already carries who
 * shared it (`design.user`) and exactly what they chose (`design.room`,
 * `design.tiles`). Cursor-paginated with server-side search, so cost tracks
 * the page rather than the number of designs ever shared. One implementation
 * for all three roles' `…/designs` pages; `area` picks the routes the cards
 * link to and the string set.
 */
export const SharedDesignsView = ({ area }: { area: SharedDesignsArea }) => {
  const { t } = useTranslation();
  const k = (key: string) => `${area}.designs.${key}`;
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), 300);
  const { data, loading, error, reload } = useApi(
    () => roomsApi.sharedDesigns({ limit: PAGE_SIZE, search: query || undefined }),
    [query],
  );
  const {
    items: designs,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
  } = useCursorList({
    firstPage: data,
    fetchPage: (cursor) => roomsApi.sharedDesigns({ cursor, limit: PAGE_SIZE, search: query || undefined }),
    fallbackError: t(k("loadMoreError")),
  });

  return (
    <div className="pb-10">
      <DashboardPageHeader title={t(k("title"))} subtitle={t(k("subtitle"))} />

      <div className="relative mt-6 max-w-md">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(k("searchPlaceholder"))}
          aria-label={t(k("searchAria"))}
          className="h-11 rounded-lg pl-10 text-sm"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <ApiLoading label={t(k("loading"))} className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : designs.length === 0 && query ? (
          <ApiEmptyState message={t(k("noSearchResults"))} className="py-16" />
        ) : designs.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-ink">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-ink">{t(k("emptyTitle"))}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t(k("emptyBody"))}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {designs.map((design) => (
                <DesignCard key={design.id} design={design} area={area} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button type="button" variant="outline" onClick={() => void loadMore()} disabled={loadingMore} className="h-10 gap-2 px-5 text-sm font-bold">
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  {loadingMore ? t("staff.loading") : t(k("loadMore"))}
                </Button>
                {loadMoreError && <p className="text-xs text-red-600">{loadMoreError}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
