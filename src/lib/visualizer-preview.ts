import type { ApiProduct, RoomType } from "./api/types";

type PreviewProduct = Pick<
  ApiProduct,
  "isActive" | "suitableFor" | "roomTypes"
>;

/** Resolve deep-linked products independently of the paginated tile picker. */
export async function loadVisualizerPreview<T extends PreviewProduct>(
  floorId: string | null,
  wallId: string | null,
  getProduct: (id: string) => Promise<T>,
) {
  const ids = [
    ...new Set([floorId, wallId].filter((id): id is string => Boolean(id))),
  ];
  const products = await Promise.all(
    ids.map(async (id) => [id, await getProduct(id)] as const),
  );
  const byId = new Map(products);
  const floor = floorId ? (byId.get(floorId) ?? null) : null;
  const walls = wallId ? (byId.get(wallId) ?? null) : null;
  if (
    (floor &&
      (!floor.isActive || !["FLOOR", "BOTH"].includes(floor.suitableFor))) ||
    (walls &&
      (!walls.isActive || !["WALL", "BOTH"].includes(walls.suitableFor)))
  ) {
    throw new Error("The requested tile is unavailable for this surface.");
  }
  return { floor, walls };
}

/** Prefer a requested room when compatible, otherwise choose an available compatible room. */
export function resolvePreviewRoom(
  requestedRoom: string | null,
  availableRooms: RoomType[],
  preview: {
    floor: PreviewProduct | null;
    walls: PreviewProduct | null;
  } | null,
): RoomType | null {
  const compatibleRooms = availableRooms.filter((room) =>
    [preview?.floor, preview?.walls].every(
      (product) => !product || product.roomTypes.includes(room),
    ),
  );
  return (
    compatibleRooms.find((room) => room === requestedRoom) ??
    compatibleRooms[0] ??
    null
  );
}
