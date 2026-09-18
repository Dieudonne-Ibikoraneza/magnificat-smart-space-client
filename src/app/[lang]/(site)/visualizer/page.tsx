"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Eye, Layers3, Search, ShoppingCart } from "lucide-react";
import type { Product } from "@/components/product-card";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { collectionsApi, eventsApi, productsApi, roomsApi, toProduct, tokenStore } from "@/lib/api";
import { localizedText } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";
import type { ApiCollection, ApiRoom, RoomType } from "@/lib/api/types";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { getSessionId } from "@/lib/session-id";
import { cn } from "@/lib/utils";

type Surface = "floor" | "walls";
type SurfaceSelections = Record<Surface, Product | null>;
const EMPTY_SELECTIONS: SurfaceSelections = { floor: null, walls: null };

/**
 * The four room types the app supports, each with its own tuned 3D scene
 * component (`components/visualizer/*`). A room with no backing `Room` row is
 * filtered out below
 * rather than shown as a tab that goes nowhere.
 */
type RoomTabKey =
  | "catalog.roomTypes.kitchen"
  | "catalog.roomTypes.livingRoom"
  | "catalog.roomTypes.bathroom"
  | "catalog.roomTypes.bedroom";

const ROOM_TABS: { labelKey: RoomTabKey; type: RoomType }[] = [
  { labelKey: "catalog.roomTypes.kitchen", type: "KITCHEN" },
  { labelKey: "catalog.roomTypes.livingRoom", type: "LIVING_ROOM" },
  { labelKey: "catalog.roomTypes.bathroom", type: "BATHROOM" },
  { labelKey: "catalog.roomTypes.bedroom", type: "BEDROOM" },
];

const surfaceToRoomSurface: Record<Surface, "FLOOR" | "WALL"> = {
  floor: "FLOOR",
  walls: "WALL",
};

// three.js pulls in a WebGL renderer that can't run during SSR, and a room
// GLB runs from several hundred KB to tens of MB — both are reasons to keep
// it out of the initial page bundle and mount it only in the browser.
const RoomLoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="flex size-full items-center justify-center">
      <p className="text-sm font-semibold text-muted">{t("visualizer.loadingRoom")}</p>
    </div>
  );
};

const Kitchen = dynamic(() => import("@/components/visualizer/kitchen"), {
  ssr: false,
  loading: RoomLoadingFallback,
});
const LivingRoom = dynamic(() => import("@/components/visualizer/living-room"), {
  ssr: false,
  loading: RoomLoadingFallback,
});
const Bathroom = dynamic(() => import("@/components/visualizer/bathroom"), {
  ssr: false,
  loading: RoomLoadingFallback,
});
const Bedroom = dynamic(() => import("@/components/visualizer/bedroom"), {
  ssr: false,
  loading: RoomLoadingFallback,
});

const panelHeight =
  "h-[calc(100dvh-7rem)] sm:h-[calc(100dvh-8rem)]";

/**
 * The 3D viewport specifically (not the tile-picker sidebar, which is a plain
 * scrollable list and has no comparable ceiling) — `panelHeight` alone tracks
 * `100dvh`, uncapped, so on a tall enough display it hands the WebGL canvas
 * an increasingly tall, narrow frame to render into. The room's own camera
 * rig (`room-scene.tsx`) derives its field of view from that frame's aspect
 * ratio, so an extreme one pushes the vertical fov toward its own floor and
 * the room reads as unnaturally zoomed in — a device-height problem showing
 * up as a camera problem. Capping the viewport's own height is what keeps
 * the aspect ratio (and so the camera) in the range it was actually tuned
 * for, however tall the screen gets.
 */
const viewportPanelHeight = cn(panelHeight, "max-h-[820px]");

const TilePickerCard = ({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
}) => {
  const { t } = useTranslation();

  return (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "relative w-24 shrink-0 text-left transition-opacity hover:opacity-90",
      selected && "opacity-100",
    )}
    aria-pressed={selected}
    aria-label={t("visualizer.selectTileAria", { name: product.name })}
  >
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl border-2 bg-white",
        selected ? "border-primary" : "border-transparent",
      )}
    >
      <Image
        src={product.image}
        alt={product.name}
        fill
        unoptimized
        className="object-cover"
        sizes="96px"
      />
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-ink shadow-sm">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </div>
    <p className="mt-2 truncate text-xs font-medium text-ink">{product.name}</p>
  </button>
  );
};

const SurfaceToggle = ({
  activeSurface,
  onChange,
}: {
  activeSurface: Surface;
  onChange: (surface: Surface) => void;
}) => {
  const { t } = useTranslation();

  return (
  <div
    className="relative grid grid-cols-2 rounded-full bg-muted-background p-1"
    role="tablist"
    aria-label={t("visualizer.surfaceTypeAria")}
  >
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-ink shadow-sm transition-transform duration-300 ease-out",
        activeSurface === "walls" && "translate-x-[calc(100%+0.5rem)]",
      )}
    />
    {(["floor", "walls"] as const).map((surface) => (
      <button
        key={surface}
        type="button"
        role="tab"
        aria-selected={activeSurface === surface}
        onClick={() => onChange(surface)}
        className={cn(
          "relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300",
          activeSurface === surface
            ? "text-white"
            : "text-muted hover:text-ink",
        )}
      >
        {surface === "floor" ? t("visualizer.surface.floor") : t("visualizer.surface.walls")}
      </button>
    ))}
  </div>
  );
};

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const SURFACE_LABEL_KEYS = {
  floor: "visualizer.surfaceLabel.floor",
  wall: "visualizer.surfaceLabel.wall",
  floorAndWall: "visualizer.surfaceLabel.floorAndWall",
} as const;

/**
 * The tiles currently applied in the 3D preview, each addable to the cart
 * without leaving the visualizer. A "both"-suitable tile fills the floor and
 * the walls with the same product, so it's shown once (labelled "Floor & Wall")
 * rather than as two identical rows. Quantity is additive by one box, matching
 * the catalog card's own "Add to cart" (see `product-card.tsx`).
 */
const AppliedTilesCart = ({
  floorTile,
  wallTile,
  onAddToCart,
}: {
  floorTile?: Product;
  wallTile?: Product;
  /** Absent for staff — favorites/cart are a customer feature, so they see what's applied without a cart button. */
  onAddToCart?: (product: Product) => void;
}) => {
  const { t } = useTranslation();
  const sameTile = !!floorTile && floorTile.id === wallTile?.id;
  const rows: { product: Product; labelKey: (typeof SURFACE_LABEL_KEYS)[keyof typeof SURFACE_LABEL_KEYS] }[] = [];
  if (floorTile) rows.push({ product: floorTile, labelKey: sameTile ? SURFACE_LABEL_KEYS.floorAndWall : SURFACE_LABEL_KEYS.floor });
  if (wallTile && !sameTile) rows.push({ product: wallTile, labelKey: SURFACE_LABEL_KEYS.wall });

  if (rows.length === 0) return null;

  return (
    <div className="mt-4 shrink-0 space-y-2 border-t border-slate-100 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("visualizer.inThisDesign")}</p>
      {rows.map(({ product, labelKey }) => (
        <div
          key={labelKey}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2"
        >
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted-background">
            <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" sizes="48px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
            <p className="text-xs text-muted">
              {t(labelKey)} · {formatPrice(product.price)} {t("visualizer.pricePerSqm")}
            </p>
          </div>
          {/* Every signed-in role can open a tile's page, so unlike the cart
              button this isn't limited to customers. */}
          <Tooltip>
            <TooltipTrigger
              render={<Link href={`/products/${product.id}`} />}
              aria-label={t("visualizer.viewDetailsOf", { name: product.name })}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-muted-background focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Eye className="size-4" strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>{t("visualizer.viewDetails")}</TooltipContent>
          </Tooltip>
          {onAddToCart && (
            <Button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={product.stockStatus === "out_of_stock"}
              className="h-9 shrink-0 gap-1.5 px-3 text-xs font-bold text-ink bg-primary hover:bg-primary/90 disabled:opacity-60"
            >
              <ShoppingCart className="size-3.5" strokeWidth={2} />
              {product.stockStatus === "out_of_stock" ? t("visualizer.soldOut") : t("visualizer.add")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

const ConfigureSpacePanel = ({
  activeSurface,
  onSurfaceChange,
  searchQuery,
  onSearchChange,
  openAccordionItems,
  onOpenAccordionChange,
  filteredCollections,
  productsLoading,
  selectedProductId,
  onSelectTile,
  showActions = true,
  onOpenSaveDialog,
  floorTile,
  wallTile,
  onAddTileToCart,
}: {
  activeSurface: Surface;
  onSurfaceChange: (surface: Surface) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  openAccordionItems: string[];
  onOpenAccordionChange: (value: string[]) => void;
  filteredCollections: Array<{ collection: ApiCollection; products: Product[] }>;
  productsLoading: boolean;
  selectedProductId: string | null;
  onSelectTile: (product: Product) => void;
  showActions?: boolean;
  onOpenSaveDialog: () => void;
  floorTile?: Product;
  wallTile?: Product;
  onAddTileToCart?: (product: Product) => void;
}) => {
  const { t } = useTranslation();

  return (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="relative z-10 shrink-0 space-y-3 bg-background pb-3">
      <div className="flex items-center gap-2">
        <Layers3 className="size-5 text-ink" strokeWidth={2} />
        <h2 className="text-lg font-bold text-ink">{t("visualizer.configureSpace")}</h2>
      </div>

      <SurfaceToggle activeSurface={activeSurface} onChange={onSurfaceChange} />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("visualizer.searchPlaceholder")}
          className="h-10 rounded-xl bg-white py-0 pl-10 leading-10"
        />
      </div>
    </div>

    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t border-slate-100 pt-2">
      {productsLoading ? (
        <ApiLoading label={t("visualizer.loadingTiles")} className="py-8" />
      ) : filteredCollections.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {t("visualizer.noSearchResults")}
        </p>
      ) : (
        <div className="pb-8">
          <Accordion
            multiple
            value={openAccordionItems}
            onValueChange={onOpenAccordionChange}
          >
            {filteredCollections.map(({ collection, products: collectionProducts }) => (
              <AccordionItem key={collection.id} value={collection.id}>
                <AccordionTrigger className="cursor-pointer py-3 text-sm font-semibold text-ink hover:no-underline focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                  {collection.title}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {collectionProducts.length === 0 ? (
                    <p className="text-sm text-muted">
                      {t("visualizer.noTilesInCollection")}
                    </p>
                  ) : (
                    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
                      {collectionProducts.map((product) => (
                        <TilePickerCard
                          key={product.id}
                          product={product}
                          selected={selectedProductId === product.id}
                          onSelect={() => onSelectTile(product)}
                        />
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>

    <AppliedTilesCart floorTile={floorTile} wallTile={wallTile} onAddToCart={onAddTileToCart} />

    {showActions && (
      <div className="mt-4 shrink-0">
        <Button
          type="button"
          onClick={onOpenSaveDialog}
          className="h-11 w-full gap-2 px-4 text-sm font-bold text-ink bg-primary hover:bg-primary/90"
        >
          <Bookmark className="size-4" strokeWidth={2} />
          {t("visualizer.saveDesign")}
        </Button>
      </div>
    )}
  </div>
  );
};

const MobileTilePickerSheet = ({
  open,
  closing,
  onClose,
  children,
}: {
  open: boolean;
  closing: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm lg:hidden",
        closing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t("visualizer.chooseTilesAria")}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-background px-5 shadow-2xl duration-300",
          closing
            ? "animate-out slide-out-to-bottom-full fade-out"
            : "animate-in slide-in-from-bottom-full fade-in",
        )}
      >
        <div className="relative flex shrink-0 items-center justify-center px-5 pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>

        <Button
          type="button"
          variant="link"
          className="h-auto shrink-0 justify-center py-4 text-sm text-amber"
          onClick={onClose}
        >
          {t("visualizer.close")}
        </Button>
      </div>
    </div>
  );
};

/** Sharing is chosen at save time (there's no separate share link/endpoint) —
 * see `roomsApi.saveDesign`'s `sharedWithSales` flag and the account "Saved
 * designs" page, which documents the same contract. */
const SaveDesignDialog = ({
  open,
  onOpenChange,
  roomLabel,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomLabel: string;
  saving: boolean;
  onSave: (name: string, sharedWithSales: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the form whenever the dialog transitions from closed to open —
  // derived during render (React's own pattern for this) rather than an
  // effect, so there's no extra commit before the reset is visible.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(t("visualizer.saveDialog.nameDefault", { room: roomLabel }));
      setShared(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose>
        <DialogTitle>{t("visualizer.saveDialog.title")}</DialogTitle>
        <DialogDescription>
          {t("visualizer.saveDialog.description")}
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <Field>
            <FieldLabel htmlFor="design-name">{t("visualizer.saveDialog.nameLabel")}</FieldLabel>
            <Input
              id="design-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("visualizer.saveDialog.namePlaceholder")}
            />
          </Field>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{t("visualizer.saveDialog.shareTitle")}</p>
              <p className="mt-0.5 text-xs text-muted">
                {t("visualizer.saveDialog.shareHint")}
              </p>
            </div>
            <Switch
              checked={shared}
              onCheckedChange={setShared}
              aria-label={t("visualizer.saveDialog.shareAria")}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("visualizer.saveDialog.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving || name.trim().length === 0}
            onClick={() => onSave(name.trim(), shared)}
            className="bg-primary text-ink hover:bg-primary/90"
          >
            {saving ? t("visualizer.saveDialog.saving") : t("visualizer.saveDialog.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VisualizerPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const cart = useCart();
  const { user } = useCurrentUser();
  const isClient = user?.role === "CLIENT";
  const searchParams = useSearchParams();
  const designIdParam = searchParams.get("design");
  // Read once, from whatever the URL had on first render — `router.replace`
  // below is what keeps it in sync afterward, so re-reading `searchParams`
  // here on every render would just be redoing that same initial read.
  const [initialRoomParam] = useState(() => searchParams.get("room"));
  const [initialFloorParam] = useState(() => searchParams.get("floor"));
  const [initialWallParam] = useState(() => searchParams.get("wall"));

  const [activeRoomType, setActiveRoomType] = useState<RoomType | null>(() =>
    initialRoomParam && ROOM_TABS.some((tab) => tab.type === initialRoomParam)
      ? (initialRoomParam as RoomType)
      : null,
  );
  const [activeSurface, setActiveSurface] = useState<Surface>("floor");
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Keyed by room type — a tile picked while designing the bathroom must
  // never bleed onto the bedroom (or any other room) just because they share
  // this one page. Each room keeps its own floor/wall picks, and switching
  // tabs only ever reads/writes the entry for whichever room is active.
  const [selectionsByRoom, setSelectionsByRoom] = useState<
    Partial<Record<RoomType, SurfaceSelections>>
  >({});

  const {
    data: apiRooms,
    loading: roomsLoading,
    error: roomsError,
    reload: reloadRooms,
  } = useApi(() => roomsApi.list());

  const {
    data: collectionsPage,
    loading: collectionsLoading,
    error: collectionsError,
    reload: reloadCollections,
  } = useApi(() => collectionsApi.list({ limit: 100 }));

  const roomsByType = useMemo(() => {
    const map = new Map<RoomType, ApiRoom>();
    (apiRooms ?? []).forEach((room) => {
      if (room.isActive) map.set(room.type, room);
    });
    return map;
  }, [apiRooms]);

  const visibleTabs = useMemo(
    () => ROOM_TABS.filter((tab) => roomsByType.has(tab.type)),
    [roomsByType],
  );

  // Land on the first available tab once rooms load, unless the user already
  // picked one or a saved design (below) claims a specific one — a plain
  // derived value, not state, so there's nothing to synchronize via effect.
  const effectiveRoomType = activeRoomType ?? visibleTabs[0]?.type ?? null;
  const activeRoomRow = effectiveRoomType ? roomsByType.get(effectiveRoomType) : undefined;

  const { data: existingDesign } = useApi(
    () => (designIdParam ? roomsApi.getDesign(designIdParam) : Promise.resolve(null)),
    [designIdParam],
  );

  // Applies a loaded shared/saved design exactly once, the moment it arrives —
  // derived during render (comparing against the last-applied id) rather than
  // an effect, per this codebase's own convention (see `useApi`'s own state sync).
  const [appliedDesignId, setAppliedDesignId] = useState<string | null>(null);
  if (existingDesign && existingDesign.id !== appliedDesignId) {
    setAppliedDesignId(existingDesign.id);

    const roomType = existingDesign.room?.type;
    if (roomType && ROOM_TABS.some((tab) => tab.type === roomType)) {
      setActiveRoomType(roomType);
    }

    const nextSelections: SurfaceSelections = { floor: null, walls: null };
    for (const tile of existingDesign.tiles) {
      if (tile.product) {
        const surface: Surface = tile.surface === "WALL" ? "walls" : "floor";
        nextSelections[surface] = toProduct(tile.product, undefined, locale);
      }
    }
    // Written directly against the design's own room type, not the generic
    // per-room setter below — `activeRoomType` above hasn't actually taken
    // effect yet this render (state updates batch), so `effectiveRoomType`
    // would still resolve to whatever room was active *before* this design
    // loaded, silently misfiling these tiles under the wrong room.
    if (roomType) {
      setSelectionsByRoom((current) => ({ ...current, [roomType]: nextSelections }));
    }
  }

  const {
    data: productsPage,
    loading: productsLoading,
    error: productsError,
  } = useApi(
    () => productsApi.list({ roomType: effectiveRoomType ?? undefined, limit: 100 }),
    [effectiveRoomType],
  );

  const collectionsList = useMemo(() => collectionsPage?.items ?? [], [collectionsPage]);
  const collectionTitleById = useMemo(
    () =>
      new Map(
        collectionsList.map((collection) => [
          collection.id,
          localizedText(collection.title, collection.titleRw, locale),
        ]),
      ),
    [collectionsList, locale],
  );
  const mappedProducts = useMemo(
    () =>
      (productsPage?.items ?? []).map((product) =>
        toProduct(product, collectionTitleById.get(product.collectionId), locale),
      ),
    [productsPage, collectionTitleById, locale],
  );

  // Every room used to always open pre-tiled rather than bare — replicate
  // that once each room's own product list first loads, preferring whatever
  // `?floor=`/`?wall=` named (a shared/bookmarked link — only meaningful for
  // the room that link actually pointed at, never a room switched to later)
  // and otherwise falling back to the first floor-suitable and first
  // wall-suitable product from that room's own API results — not just the
  // same first product for both, since a floor-only or wall-only tile would
  // then get wrongly defaulted onto the surface it can't go on. Tracked per
  // room type so switching to a room that's never been visited this session
  // still gets its own defaults, without re-defaulting (and stomping the
  // customer's own picks) on a room switched back to. Skipped when a saved
  // design is being loaded via `?design=`, so it can't stomp that design's
  // own tiles.
  const [defaultAppliedRooms, setDefaultAppliedRooms] = useState<Set<RoomType>>(
    () => new Set(),
  );
  if (
    effectiveRoomType &&
    !defaultAppliedRooms.has(effectiveRoomType) &&
    !designIdParam &&
    mappedProducts.length > 0
  ) {
    const roomType = effectiveRoomType;
    setDefaultAppliedRooms((current) => new Set(current).add(roomType));
    const isInitialRoom = initialRoomParam === roomType;
    const floorFromUrl =
      isInitialRoom && initialFloorParam
        ? mappedProducts.find(
            (product) =>
              product.id === initialFloorParam &&
              (product.suitableFor === "floor" || product.suitableFor === "both"),
          )
        : undefined;
    const wallFromUrl =
      isInitialRoom && initialWallParam
        ? mappedProducts.find(
            (product) =>
              product.id === initialWallParam &&
              (product.suitableFor === "wall" || product.suitableFor === "both"),
          )
        : undefined;
    const firstFloorTile = mappedProducts.find(
      (product) => product.suitableFor === "floor" || product.suitableFor === "both",
    );
    const firstWallTile = mappedProducts.find(
      (product) => product.suitableFor === "wall" || product.suitableFor === "both",
    );
    setSelectionsByRoom((current) => {
      const currentForRoom = current[roomType] ?? EMPTY_SELECTIONS;
      return {
        ...current,
        [roomType]: {
          floor: currentForRoom.floor ?? floorFromUrl ?? firstFloorTile ?? mappedProducts[0],
          walls: currentForRoom.walls ?? wallFromUrl ?? firstWallTile ?? mappedProducts[0],
        },
      };
    });
  }

  const selections: SurfaceSelections =
    (effectiveRoomType && selectionsByRoom[effectiveRoomType]) || EMPTY_SELECTIONS;

  const setSelections = (
    updater: SurfaceSelections | ((current: SurfaceSelections) => SurfaceSelections),
  ) => {
    if (!effectiveRoomType) return;
    const roomType = effectiveRoomType;
    setSelectionsByRoom((current) => {
      const currentForRoom = current[roomType] ?? EMPTY_SELECTIONS;
      const next = typeof updater === "function" ? updater(currentForRoom) : updater;
      return { ...current, [roomType]: next };
    });
  };

  // Keeps the URL reflecting whatever's actually selected — room, floor
  // tile, wall tile — so the current view is shareable/bookmarkable and
  // survives a reload. `replace` (not `push`): every tile click or room
  // switch shouldn't pile up its own back-button entry. Skipped while a
  // `?design=` is still loading, so it can't overwrite that link with the
  // pre-design defaults for the one render before the design's own tiles land.
  useEffect(() => {
    if (designIdParam && !appliedDesignId) return;

    const params = new URLSearchParams(searchParams.toString());
    if (effectiveRoomType) params.set("room", effectiveRoomType);
    else params.delete("room");
    if (selections.floor) params.set("floor", selections.floor.id);
    else params.delete("floor");
    if (selections.walls) params.set("wall", selections.walls.id);
    else params.delete("wall");

    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`?${next}`, { scroll: false });
    }
  }, [
    effectiveRoomType,
    selections.floor,
    selections.walls,
    designIdParam,
    appliedDesignId,
    router,
    searchParams,
  ]);

  const filteredCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    // A floor-only tile picked while the "Walls" tab is active (or vice
    // versa) is exactly the mismatch registration's own "Suitable For"
    // field exists to prevent — the picker must only ever offer what the
    // customer could actually apply to the surface they're configuring.
    const suitableForActiveSurface = (product: Product) =>
      product.suitableFor === "both" ||
      (activeSurface === "floor" ? product.suitableFor === "floor" : product.suitableFor === "wall");

    return collectionsList
      .map((collection) => ({
        collection,
        products: mappedProducts.filter((product) => {
          if (product.collectionId !== collection.id) return false;
          if (!suitableForActiveSurface(product)) return false;
          if (!query) return true;
          return (
            product.name.toLowerCase().includes(query) ||
            product.size.toLowerCase().includes(query) ||
            collection.title.toLowerCase().includes(query)
          );
        }),
      }))
      .filter(
        ({ collection, products: collectionProducts }) =>
          collectionProducts.length > 0 || collection.title.toLowerCase().includes(query),
      );
  }, [collectionsList, mappedProducts, searchQuery, activeSurface]);

  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(() =>
    filteredCollections.length > 0 ? [filteredCollections[0].collection.id] : [],
  );

  const validAccordionIds = new Set(filteredCollections.map(({ collection }) => collection.id));
  const visibleAccordionItems = openAccordionItems.filter((id) => validAccordionIds.has(id));
  const effectiveAccordionItems =
    visibleAccordionItems.length > 0
      ? visibleAccordionItems
      : filteredCollections.length > 0
        ? [filteredCollections[0].collection.id]
        : [];

  const selectedProduct = selections[activeSurface];
  const floorTile = selections.floor ?? undefined;
  const wallTile = selections.walls ?? undefined;

  const closePicker = () => {
    setPickerClosing(true);
    window.setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, 280);
  };

  const appliedTileEventFiredRef = useRef(false);
  const handleSelectTile = (product: Product) => {
    setSelections((current) => ({
      ...current,
      [activeSurface]: product,
    }));

    const sessionId = getSessionId();
    // Every apply is its own interaction event (mirrors the "VIEWED" event
    // fired per product view) — the funnel stage below only needs firing once
    // per session, so it doesn't inflate "how many customers applied a tile".
    void eventsApi
      .tile({ sessionId, productId: product.id, type: "APPLIED" })
      .catch(() => undefined);
    if (!appliedTileEventFiredRef.current) {
      appliedTileEventFiredRef.current = true;
      void eventsApi.journey({ sessionId, stage: "APPLIED_TILE" }).catch(() => undefined);
    }

    if (pickerOpen) closePicker();
  };

  // The funnel's very first stage — opening the design tool at all, before
  // any room is even picked — otherwise every later stage (CREATED_ROOM
  // onward) had real data but this one was always zero, which is what made
  // the funnel read as broken rather than just slow to fill in.
  const openedSystemEventFiredRef = useRef(false);
  useEffect(() => {
    if (openedSystemEventFiredRef.current) return;
    openedSystemEventFiredRef.current = true;
    void eventsApi
      .journey({ sessionId: getSessionId(), stage: "OPENED_SYSTEM" })
      .catch(() => undefined);
  }, []);

  const createdRoomEventFiredRef = useRef(false);
  useEffect(() => {
    if (!activeRoomRow || createdRoomEventFiredRef.current) return;
    createdRoomEventFiredRef.current = true;
    // `roomId` lets the journey drill-down resolve this to the real Room
    // (name, type, thumbnail) instead of falling back to a generic "Started
    // a new room design" — see `journeyStageActions`'s CREATED_ROOM case.
    void eventsApi
      .journey({ sessionId: getSessionId(), stage: "CREATED_ROOM", metadata: { roomId: activeRoomRow.id } })
      .catch(() => undefined);
  }, [activeRoomRow]);

  const openPicker = () => {
    setPickerClosing(false);
    setPickerOpen(true);
  };

  const activeTab = visibleTabs.find((tab) => tab.type === effectiveRoomType);

  const openSaveDialog = () => {
    if (!tokenStore.getAccessToken()) {
      toast.error(t("visualizer.toast.signInRequiredTitle"), {
        description: t("visualizer.toast.signInToSave"),
      });
      router.push("/auth");
      return;
    }
    if (!selections.floor && !selections.walls) {
      toast.error(t("visualizer.toast.chooseTileTitle"), {
        description: t("visualizer.toast.chooseTileBody"),
      });
      return;
    }
    if (!activeRoomRow) {
      toast.error(t("visualizer.toast.roomNotReadyTitle"), {
        description: t("visualizer.toast.roomNotReadyBody"),
      });
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleSaveDesign = async (name: string, sharedWithSales: boolean) => {
    if (!activeRoomRow) return;

    const tiles = (Object.entries(selections) as [Surface, Product | null][])
      .filter((entry): entry is [Surface, Product] => entry[1] !== null)
      .map(([surface, product]) => ({
        surface: surfaceToRoomSurface[surface],
        productId: product.id,
      }));

    setSaving(true);
    try {
      await roomsApi.saveDesign({ roomId: activeRoomRow.id, name, tiles, sharedWithSales });
      toast.success(t("visualizer.toast.savedTitle"), {
        description: sharedWithSales
          ? t("visualizer.toast.savedShared")
          : t("visualizer.toast.savedPrivate"),
      });
      setSaveDialogOpen(false);
    } catch (cause) {
      toast.error(t("visualizer.toast.saveFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("visualizer.toast.tryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  // Add a tile that's already in the preview straight to the cart, no
  // navigation — additive by one box, matching the catalog card's own
  // "Add to cart" (`product-card.tsx`). Anonymous visitors are sent to
  // sign in first, same as everywhere else the cart is touched.
  const addTileToCart = (product: Product) => {
    if (!tokenStore.getAccessToken()) {
      toast.error(t("visualizer.toast.signInRequiredTitle"), {
        description: t("visualizer.toast.signInToAddToCart"),
      });
      router.push("/auth");
      return;
    }
    const existing = cart.lines.find((line) => line.productId === product.id);
    const nextArea = Math.round(((existing?.areaSqm ?? 0) + product.boxCoverage) * 100) / 100;
    cart.setQuantity(product, nextArea);
    toast.success(t("visualizer.toast.addedTitle"), {
      description: t("visualizer.toast.addedBody", { name: product.name, area: nextArea }),
    });
  };

  const configurePanelProps = {
    activeSurface,
    onSurfaceChange: setActiveSurface,
    searchQuery,
    onSearchChange: setSearchQuery,
    openAccordionItems: effectiveAccordionItems,
    onOpenAccordionChange: setOpenAccordionItems,
    filteredCollections,
    productsLoading,
    selectedProductId: selectedProduct?.id ?? null,
    onSelectTile: handleSelectTile,
    onOpenSaveDialog: openSaveDialog,
    floorTile,
    wallTile,
    onAddTileToCart: isClient ? addTileToCart : undefined,
  };

  if (roomsLoading || collectionsLoading) {
    return <ApiLoading label={t("visualizer.loading")} className="py-24" />;
  }

  if (roomsError) {
    return <ApiErrorState message={roomsError} onRetry={reloadRooms} className="my-16" />;
  }

  if (collectionsError) {
    return <ApiErrorState message={collectionsError} onRetry={reloadCollections} className="my-16" />;
  }

  if (visibleTabs.length === 0) {
    return (
      <ApiEmptyState
        message={t("visualizer.empty")}
        className="my-16"
      />
    );
  }

  return (
    <>
      <div className={cn("flex flex-col lg:flex-row lg:gap-8", panelHeight)}>
        <div className={cn("relative min-h-0 min-w-0 flex-1", viewportPanelHeight)}>
          <div className="relative flex size-full flex-col overflow-hidden rounded-2xl bg-muted-background shadow-inner">
            {/* Above the room's own loading overlay (`RoomLoadingOverlay`,
                `room-scene.tsx`) — both are absolutely positioned over this
                same viewport at the same z-index, and DOM order alone would
                let a room mid-load paint over these tabs and hide them. */}
            <div className="absolute left-3 right-3 top-3 z-20 sm:left-4 sm:right-auto">
              <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-full bg-white/95 p-1 shadow-sm backdrop-blur-sm">
                {visibleTabs.map((tab) => (
                  <Button
                    key={tab.type}
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveRoomType(tab.type)}
                    className={cn(
                      "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-all duration-300 sm:h-10 sm:px-5",
                      effectiveRoomType === tab.type
                        ? "bg-ink text-white hover:bg-ink hover:text-white"
                        : "text-ink hover:bg-muted-background",
                    )}
                  >
                    {t(tab.labelKey)}
                  </Button>
                ))}
              </div>
            </div>

            {productsError ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="max-w-sm text-center text-sm text-muted">{productsError}</p>
              </div>
            ) : effectiveRoomType === "LIVING_ROOM" ? (
              <LivingRoom floorTile={floorTile} wallTile={wallTile} className="relative flex-1" />
            ) : effectiveRoomType === "BATHROOM" ? (
              <Bathroom floorTile={floorTile} wallTile={wallTile} className="relative flex-1" />
            ) : effectiveRoomType === "BEDROOM" ? (
              <Bedroom floorTile={floorTile} wallTile={wallTile} className="relative flex-1" />
            ) : effectiveRoomType === "KITCHEN" ? (
              <Kitchen floorTile={floorTile} wallTile={wallTile} className="relative flex-1" />
            ) : null}

            {/* Same reasoning as the tabs above — kept above the room's own loading overlay. */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex gap-2 p-4 lg:hidden">
              <Button
                type="button"
                onClick={openPicker}
                className="h-11 flex-1 gap-2 bg-primary text-sm font-bold text-ink hover:bg-primary/90"
              >
                <Layers3 className="size-4" strokeWidth={2} />
                {selectedProduct ? t("visualizer.changeTile") : t("visualizer.chooseTiles")}
              </Button>
              {isClient && (
                <Button
                  type="button"
                  onClick={openSaveDialog}
                  className="h-11 shrink-0 gap-2 bg-primary px-3 text-sm font-bold text-ink hover:bg-primary/90"
                  aria-label={t("visualizer.saveDesignAria")}
                >
                  <Bookmark className="size-4" strokeWidth={2} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside
          className={cn(
            "hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden bg-transparent lg:flex",
            panelHeight,
          )}
        >
          <ConfigureSpacePanel {...configurePanelProps} showActions={isClient} />
        </aside>
      </div>

      <MobileTilePickerSheet
        open={pickerOpen}
        closing={pickerClosing}
        onClose={closePicker}
      >
        <ConfigureSpacePanel {...configurePanelProps} showActions={false} />
      </MobileTilePickerSheet>

      <SaveDesignDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        roomLabel={activeTab ? t(activeTab.labelKey) : t("visualizer.roomFallback")}
        saving={saving}
        onSave={(name, sharedWithSales) => void handleSaveDesign(name, sharedWithSales)}
      />
    </>
  );
};

export default VisualizerPage;
