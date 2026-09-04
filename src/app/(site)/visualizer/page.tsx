"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Layers3,
  Search,
  Share2,
} from "lucide-react";
import type { Product } from "@/components/product-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProductsByCollection, products } from "@/data/catalog";
import { collections } from "@/data/collections";
import { cn } from "@/lib/utils";

const rooms = ["Kitchen", "Living Room", "Bathroom", "Bedroom"] as const;

type Room = (typeof rooms)[number];
type Surface = "floor" | "walls";

/**
 * Room shells live in `public/models/rooms/`, authored by
 * `scripts/generate-room-models.mjs` — same paths the seeded `Room.modelUrl`
 * values use. Rooms whose GLB hasn't been authored yet fall through to
 * `RoomScene`'s own "not available" state rather than being hidden here, so
 * the tab list keeps matching the rooms the platform actually offers.
 */
/**
 * Rooms with their own tuning (their own camera rig, tileable-mesh list —
 * see `components/visualizer/living-room.tsx`) get their own component
 * instead of an entry here, so this map only ever needs a bare model path
 * for the rooms that don't need anything more than that.
 */
const roomModels: Partial<Record<Room, string>> = {
  Kitchen: "/models/rooms/modern_kitchen.glb",
  Bathroom: "/models/rooms/bathroom.glb",
  Bedroom: "/models/rooms/bedroom.glb",
};

// three.js pulls in a WebGL renderer that can't run during SSR, and a room
// GLB runs from several hundred KB to tens of MB — both are reasons to keep
// it out of the initial page bundle and mount it only in the browser.
const roomLoadingFallback = () => (
  <div className="flex size-full items-center justify-center">
    <p className="text-sm font-semibold text-muted">Loading the room…</p>
  </div>
);

const RoomScene = dynamic(() => import("@/components/room-scene").then((mod) => mod.RoomScene), {
  ssr: false,
  loading: roomLoadingFallback,
});
const LivingRoom = dynamic(() => import("@/components/visualizer/living-room"), {
  ssr: false,
  loading: roomLoadingFallback,
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
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "relative w-24 shrink-0 text-left transition-opacity hover:opacity-90",
      selected && "opacity-100",
    )}
    aria-pressed={selected}
    aria-label={`Select ${product.name}`}
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

const SurfaceToggle = ({
  activeSurface,
  onChange,
}: {
  activeSurface: Surface;
  onChange: (surface: Surface) => void;
}) => (
  <div
    className="relative grid grid-cols-2 rounded-full bg-muted-background p-1"
    role="tablist"
    aria-label="Surface type"
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
        {surface === "floor" ? "Floor" : "Walls"}
      </button>
    ))}
  </div>
);

const ConfigureSpacePanel = ({
  activeSurface,
  onSurfaceChange,
  searchQuery,
  onSearchChange,
  openAccordionItems,
  onOpenAccordionChange,
  filteredCollections,
  selectedProductId,
  onSelectTile,
  showActions = true,
}: {
  activeSurface: Surface;
  onSurfaceChange: (surface: Surface) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  openAccordionItems: string[];
  onOpenAccordionChange: (value: string[]) => void;
  filteredCollections: Array<{
    collection: (typeof collections)[number];
    products: Product[];
  }>;
  selectedProductId: string | null;
  onSelectTile: (productId: string) => void;
  showActions?: boolean;
}) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="relative z-10 shrink-0 space-y-3 bg-background pb-3">
      <div className="flex items-center gap-2">
        <Layers3 className="size-5 text-ink" strokeWidth={2} />
        <h2 className="text-lg font-bold text-ink">Configure Space</h2>
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
          placeholder="Search by name or size..."
          className="h-10 rounded-xl bg-white py-0 pl-10 leading-10"
        />
      </div>
    </div>

    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t border-slate-100 pt-2">
      {filteredCollections.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No tiles match your search.
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
                      No tiles in this collection yet.
                    </p>
                  ) : (
                    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
                      {collectionProducts.map((product) => (
                        <TilePickerCard
                          key={product.id}
                          product={product}
                          selected={selectedProductId === product.id}
                          onSelect={() => onSelectTile(product.id)}
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

    {showActions && (
      <div className="mt-6 grid shrink-0 grid-cols-2 gap-3">
        <Button className="h-11 gap-2 px-4 text-sm font-bold text-ink bg-primary hover:bg-primary/90">
          <Bookmark className="size-4" strokeWidth={2} />
          Save Design
        </Button>
        <Button className="h-11 gap-2 px-4 text-sm font-bold text-ink bg-primary hover:bg-primary/90">
          <Share2 className="size-4" strokeWidth={2} />
          Share
        </Button>
      </div>
    )}
  </div>
);

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
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm lg:hidden",
        closing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Choose tiles"
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
          Close
        </Button>
      </div>
    </div>
  );
};

const VisualizerPage = () => {
  const [activeRoom, setActiveRoom] = useState<Room>("Kitchen");
  const [activeSurface, setActiveSurface] = useState<Surface>("floor");
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [selections, setSelections] = useState<
    Record<Surface, string | null>
  >({
    floor: "1",
    walls: "1",
  });

  const filteredCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return collections
      .map((collection) => {
        const collectionProducts = getProductsByCollection(collection.id).filter(
          (product) => {
            if (!query) return true;
            return (
              product.name.toLowerCase().includes(query) ||
              product.size.toLowerCase().includes(query) ||
              collection.title.toLowerCase().includes(query)
            );
          },
        );

        return { collection, products: collectionProducts };
      })
      .filter(
        ({ collection, products: collectionProducts }) =>
          collectionProducts.length > 0 ||
          collection.title.toLowerCase().includes(query),
      );
  }, [searchQuery]);

  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(() =>
    filteredCollections.length > 0 ? [filteredCollections[0].collection.id] : [],
  );

  const validAccordionIds = new Set(
    filteredCollections.map(({ collection }) => collection.id),
  );
  const visibleAccordionItems = openAccordionItems.filter((id) =>
    validAccordionIds.has(id),
  );
  const effectiveAccordionItems =
    visibleAccordionItems.length > 0
      ? visibleAccordionItems
      : filteredCollections.length > 0
        ? [filteredCollections[0].collection.id]
        : [];

  const selectedProductId = selections[activeSurface];
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const floorTile = products.find((product) => product.id === selections.floor);
  const wallTile = products.find((product) => product.id === selections.walls);

  const closePicker = () => {
    setPickerClosing(true);
    window.setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, 280);
  };

  const handleSelectTile = (productId: string) => {
    setSelections((current) => ({
      ...current,
      [activeSurface]: productId,
    }));

    if (pickerOpen) closePicker();
  };

  const openPicker = () => {
    setPickerClosing(false);
    setPickerOpen(true);
  };

  const configurePanelProps = {
    activeSurface,
    onSurfaceChange: setActiveSurface,
    searchQuery,
    onSearchChange: setSearchQuery,
    openAccordionItems: effectiveAccordionItems,
    onOpenAccordionChange: setOpenAccordionItems,
    filteredCollections,
    selectedProductId,
    onSelectTile: handleSelectTile,
  };

  return (
    <>
      <div className={cn("flex flex-col lg:flex-row lg:gap-8", panelHeight)}>
        <div className={cn("relative min-h-0 min-w-0 flex-1", viewportPanelHeight)}>
          <div className="relative flex size-full flex-col overflow-hidden rounded-2xl bg-muted-background shadow-inner">
            <div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-auto">
              <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-full bg-white/95 p-1 shadow-sm backdrop-blur-sm">
                {rooms.map((room) => (
                  <Button
                    key={room}
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveRoom(room)}
                    className={cn(
                      "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-all duration-300 sm:h-10 sm:px-5",
                      activeRoom === room
                        ? "bg-ink text-white hover:bg-ink hover:text-white"
                        : "text-ink hover:bg-muted-background",
                    )}
                  >
                    {room}
                  </Button>
                ))}
              </div>
            </div>

            {activeRoom === "Living Room" ? (
              <LivingRoom floorTile={floorTile} wallTile={wallTile} className="relative flex-1" />
            ) : (
              <RoomScene
                modelUrl={roomModels[activeRoom]!}
                floorTile={floorTile}
                wallTile={wallTile}
                className="relative flex-1"
              />
            )}

            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 p-4 lg:hidden">
              <Button
                type="button"
                onClick={openPicker}
                className="h-11 flex-1 gap-2 bg-primary text-sm font-bold text-ink hover:bg-primary/90"
              >
                <Layers3 className="size-4" strokeWidth={2} />
                {selectedProduct ? "Change Tile" : "Choose Tiles"}
              </Button>
              <Button
                type="button"
                className="h-11 shrink-0 gap-2 bg-primary px-3 text-sm font-bold text-ink hover:bg-primary/90"
                aria-label="Save design"
              >
                <Bookmark className="size-4" strokeWidth={2} />
              </Button>
              <Button
                type="button"
                className="h-11 shrink-0 gap-2 bg-primary px-3 text-sm font-bold text-ink hover:bg-primary/90"
                aria-label="Share design"
              >
                <Share2 className="size-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>

        <aside
          className={cn(
            "hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden bg-transparent lg:flex",
            panelHeight,
          )}
        >
          <ConfigureSpacePanel {...configurePanelProps} />
        </aside>
      </div>

      <MobileTilePickerSheet
        open={pickerOpen}
        closing={pickerClosing}
        onClose={closePicker}
      >
        <ConfigureSpacePanel {...configurePanelProps} showActions={false} />
      </MobileTilePickerSheet>
    </>
  );
};

export default VisualizerPage;
