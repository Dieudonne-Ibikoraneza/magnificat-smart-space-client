"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { Check, ChevronDown, Filter, Layers, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterOptionsCard } from "@/components/product-catalog";
import {
  buildFilterGroups,
  EMPTY_FILTERS,
  filterProducts,
  toggleFilterOption,
  type CatalogFilters,
} from "@/lib/catalog-utils";
import { roomTypeLabels } from "@/lib/api/mappers";
import {
  matchesExportTile,
  type StockExportTarget,
} from "@/lib/stock-export-filters";
import type {
  StockExportCollection,
  StockExportTileOption,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const desktopQuery = "(min-width: 768px)";
const subscribeToDesktop = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverDesktopSnapshot = () => true;

export function StockExportTilePicker({
  id,
  tiles,
  collections,
  value,
  onChange,
  disabled,
}: {
  id: string;
  tiles: StockExportTileOption[];
  collections: StockExportCollection[];
  value: StockExportTarget;
  onChange: (selection: StockExportTarget) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"tiles" | "collections">("tiles");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [collectionFilter, setCollectionFilter] = useState("ALL");
  const resultsRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    desktopSnapshot,
    serverDesktopSnapshot,
  );

  useEffect(() => {
    if (showFilters && !isDesktop) filtersRef.current?.focus();
  }, [showFilters, isDesktop]);

  const closeFilters = () => {
    setShowFilters(false);
    filterToggleRef.current?.focus();
  };

  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }, [view, search, filters, status, collectionFilter]);
  const products = useMemo(
    () =>
      tiles.map((tile) => ({
        ...tile,
        roomTypes: tile.roomTypes.map((room) => roomTypeLabels[room]),
        suitableFor: ({ FLOOR: "floor", WALL: "wall", BOTH: "both" } as const)[
          tile.suitableFor
        ],
      })),
    [tiles],
  );
  const groups = useMemo(
    () =>
      buildFilterGroups(
        products,
        collections.map((collection) => collection.size),
      ),
    [products, collections],
  );
  const visibleTiles = filterProducts(products, filters).filter(
    (tile) =>
      matchesExportTile(tile, search) &&
      (status === "ALL" || tile.isActive === (status === "ACTIVE")) &&
      (collectionFilter === "ALL" || tile.collection.id === collectionFilter),
  );
  const visibleCollections = collections.filter(
    (collection) =>
      matchesExportTile(
        { name: collection.title, sku: "", size: collection.size },
        search,
      ) &&
      (status === "ALL" || collection.isActive === (status === "ACTIVE")) &&
      (!filters.Size.length || filters.Size.includes(collection.size)),
  );
  const selectedTile =
    value.kind === "tile"
      ? tiles.find((tile) => tile.id === value.id)
      : undefined;
  const selectedCollection =
    value.kind === "collection"
      ? collections.find((collection) => collection.id === value.id)
      : undefined;
  const selectedLabel =
    selectedTile?.name ??
    selectedCollection?.title ??
    t(
      value.kind === "all"
        ? "stock.reports.output.allTiles"
        : "stock.reports.output.chooseScope",
    );
  const activeFilters =
    Object.values(filters).reduce((sum, group) => sum + group.length, 0) +
    Number(status !== "ALL") +
    Number(view === "tiles" && collectionFilter !== "ALL");
  const choose = (selection: StockExportTarget) => {
    onChange(selection);
    setOpen(false);
  };
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setStatus("ALL");
    setCollectionFilter("ALL");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setView(value.kind === "collection" ? "collections" : "tiles");
          setSearch("");
        }
      }}
    >
      <DialogTrigger
        render={
          <button
            id={id}
            type="button"
            disabled={disabled}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-border bg-white px-3.5 text-left text-sm text-ink transition-colors hover:border-ink/30 disabled:opacity-50"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedTile?.image ? (
            <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-secondary">
              <Image
                src={selectedTile.image}
                alt=""
                fill
                unoptimized
                sizes="32px"
                className="object-cover"
              />
            </span>
          ) : (
            <Layers className="size-4 shrink-0 text-muted" />
          )}
          <span className="min-w-0 truncate">{selectedLabel}</span>
          {selectedTile && (
            <span className="hidden shrink-0 text-xs text-muted sm:inline">
              {selectedTile.sku}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </DialogTrigger>
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-w-4xl flex-col overflow-hidden p-0 sm:h-[min(48rem,calc(100dvh-2rem))] sm:p-0">
        <div className="shrink-0 border-b border-border bg-card px-3 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogHeader>
            <DialogTitle>{t("stock.reports.output.pickerTitle")}</DialogTitle>
            <DialogDescription className="hidden sm:block [@media(max-height:500px)]:hidden">
              {t("stock.reports.output.pickerHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3 [@media(max-height:500px)]:mt-2">
            <div className="inline-flex rounded-lg border border-border p-1">
              {(["tiles", "collections"] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  aria-pressed={view === item}
                  onClick={() => {
                    setView(item);
                    setSearch("");
                    resetFilters();
                  }}
                  className={cn(
                    "h-8 px-2.5 text-xs font-semibold sm:h-9 sm:px-3 sm:text-sm",
                    view === item && "bg-secondary text-ink",
                  )}
                >
                  {t(`stock.reports.output.${item}`)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(activeFilters > 0 || search.trim()) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetFilters();
                    setSearch("");
                  }}
                  className="h-8 px-2.5 text-xs font-semibold text-muted sm:h-9 sm:px-3"
                >
                  {t("catalog.reset")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  showFilters ? closeFilters() : setShowFilters(true)
                }
                aria-pressed={showFilters}
                ref={filterToggleRef}
                aria-expanded={showFilters}
                aria-controls={`${id}-filters`}
                className="h-8 gap-2 px-2.5 text-xs font-semibold sm:h-9 sm:px-3"
              >
                <Filter className="size-4" />
                {t("calculator.filters")}
                {activeFilters > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] text-ink">
                    {activeFilters}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => choose({ kind: "all" })}
                className="h-8 px-2.5 text-xs font-semibold sm:h-9 sm:px-3"
              >
                {t("stock.reports.output.allTiles")}
              </Button>
            </div>
          </div>
          <div className="relative mt-3 [@media(max-height:500px)]:mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                `stock.reports.output.${view === "tiles" ? "searchTiles" : "searchCollections"}`,
              )}
              aria-label={t(
                `stock.reports.output.${view === "tiles" ? "searchTiles" : "searchCollections"}`,
              )}
              className="h-10 rounded-xl pl-10 text-base sm:h-11 sm:text-sm"
            />
          </div>
        </div>
        <div
          className={cn(
            "relative grid min-h-0 flex-1 grid-cols-[0px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden p-3 transition-[grid-template-columns] duration-250 ease-out motion-reduce:transition-none sm:p-6",
            showFilters && "md:grid-cols-[236px_minmax(0,1fr)]",
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            disabled={!showFilters}
            onClick={closeFilters}
            aria-label={t("calculator.closeFilters")}
            className={cn(
              "absolute inset-0 z-10 bg-ink/20 transition-opacity duration-250 motion-reduce:transition-none md:hidden",
              showFilters ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
          <div
            id={`${id}-filters`}
            aria-hidden={!showFilters}
            inert={!showFilters}
            className={cn(
              "absolute inset-y-3 left-3 z-20 min-h-0 w-[min(20rem,calc(100%-3rem))] transition-[transform,opacity] duration-250 ease-out motion-reduce:transition-none md:static md:z-auto md:min-w-0 md:w-auto md:overflow-hidden md:pr-4",
              showFilters
                ? "translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-full opacity-0",
            )}
          >
            <aside
              ref={filtersRef}
              aria-label={t("catalog.filters")}
              tabIndex={showFilters ? 0 : -1}
              className="h-full min-h-0 space-y-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-4 shadow-xl [scrollbar-width:thin] md:w-[220px] md:shadow-none"
            >
              <div>
                <label
                  className="mb-2 block text-xs font-semibold text-ink"
                  htmlFor={`${id}-status`}
                >
                  {t("stock.reports.output.catalogStatus")}
                </label>
                <Select
                  value={status}
                  onValueChange={(next) => setStatus(next ?? "ALL")}
                >
                  <SelectTrigger id={`${id}-status`}>
                    <SelectValue>
                      {(current: string) =>
                        t(
                          `stock.reports.output.${current === "ALL" ? "anyStatus" : current === "ACTIVE" ? "tileActive" : "tileInactive"}`,
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {["ALL", "ACTIVE", "INACTIVE"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(
                          `stock.reports.output.${item === "ALL" ? "anyStatus" : item === "ACTIVE" ? "tileActive" : "tileInactive"}`,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {view === "tiles" && (
                <div>
                  <label
                    className="mb-2 block text-xs font-semibold text-ink"
                    htmlFor={`${id}-collection`}
                  >
                    {t("stock.reports.output.collection")}
                  </label>
                  <Select
                    value={collectionFilter}
                    onValueChange={(next) => setCollectionFilter(next ?? "ALL")}
                  >
                    <SelectTrigger id={`${id}-collection`}>
                      <SelectValue>
                        {(current: string) =>
                          collections.find((item) => item.id === current)
                            ?.title ?? t("stock.reports.output.allCollections")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">
                        {t("stock.reports.output.allCollections")}
                      </SelectItem>
                      {collections.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <FilterOptionsCard
                bare
                filters={filters}
                onToggle={(group, option) =>
                  setFilters((current) =>
                    toggleFilterOption(current, group, option),
                  )
                }
                onReset={resetFilters}
                groups={
                  view === "tiles"
                    ? groups
                    : groups.filter((group) => group.title === "Size")
                }
              />
            </aside>
          </div>
          <div
            inert={showFilters && !isDesktop}
            className="col-start-2 flex min-h-0 min-w-0 flex-col"
          >
            <p className="mb-2 shrink-0 text-xs text-muted">
              {t("stock.reports.output.matchingResults", {
                count:
                  view === "tiles"
                    ? visibleTiles.length
                    : visibleCollections.length,
              })}
            </p>
            <div
              ref={resultsRef}
              role="region"
              aria-label={t(`stock.reports.output.${view}`)}
              tabIndex={0}
              className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
            >
              {view === "tiles"
                ? visibleTiles.map((tile) => {
                    const selected =
                      value.kind === "tile" && value.id === tile.id;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => choose({ kind: "tile", id: tile.id })}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                          selected
                            ? "border-ink bg-secondary"
                            : "border-slate-100 hover:bg-secondary/50",
                        )}
                      >
                        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                          {tile.image ? (
                            <Image
                              src={tile.image}
                              alt=""
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Layers className="size-5 text-muted" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {tile.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {tile.sku} · {tile.size} · {tile.collection.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {t("stock.reports.output.pickerStock", {
                              quantity: tile.quantityOnHandSqm.toLocaleString(),
                            })}
                            {!tile.isActive &&
                              ` · ${t("stock.reports.output.tileInactive")}`}
                          </span>
                        </span>
                        {selected && (
                          <Check className="size-4 shrink-0 text-ink" />
                        )}
                      </button>
                    );
                  })
                : visibleCollections.map((collection) => {
                    const selected =
                      value.kind === "collection" && value.id === collection.id;
                    return (
                      <button
                        key={collection.id}
                        type="button"
                        onClick={() =>
                          choose({ kind: "collection", id: collection.id })
                        }
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                          selected
                            ? "border-ink bg-secondary"
                            : "border-slate-100 hover:bg-secondary/50",
                        )}
                      >
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Layers className="size-5 text-muted" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {collection.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {collection.size} ·{" "}
                            {t("stock.reports.output.collectionTiles", {
                              count: collection.productCount,
                            })}
                            {!collection.isActive &&
                              ` · ${t("stock.reports.output.tileInactive")}`}
                          </span>
                        </span>
                        {selected && (
                          <Check className="size-4 shrink-0 text-ink" />
                        )}
                      </button>
                    );
                  })}
              {(view === "tiles"
                ? visibleTiles.length
                : visibleCollections.length) === 0 && (
                <p className="py-10 text-center text-sm text-muted">
                  {t("stock.reports.output.noMatches")}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
