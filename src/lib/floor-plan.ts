import { calculateTileQuantity, type TilePackaging } from "@/lib/tile-calculator";

/**
 * Floor plan calculator (doc 3.8). Takes room dimensions (or a total area),
 * adds a wastage allowance, converts that to boxes and pieces, then splits the
 * result between what current stock covers and what has to be sourced
 * separately — the "client parts" the doc asks us to call out — and prices it.
 *
 * Mirrors the server's `POST /calculator/floor-plan`, so both sides produce the
 * same numbers for the same inputs.
 */
export const DEFAULT_WASTAGE_PERCENT = 10;

export type FloorPlanInput = {
  /** Either both dimensions, or `totalAreaSqm` on its own. */
  lengthM?: number;
  widthM?: number;
  totalAreaSqm?: number;
  wastagePercent?: number;
};

export type FloorPlanProduct = TilePackaging & {
  /** Price per square metre (m²), in RWF — what staff enter, and what pricing is based on, not the box. */
  price: number;
  /** Pieces physically available to allocate right now. */
  availablePieces: number;
};

export type FloorPlanResult = {
  baseAreaSqm: number;
  wastagePercent: number;
  requiredAreaSqm: number;
  completeBoxes: number;
  remainingPieces: number;
  totalPieces: number;
  purchasedAreaSqm: number;
  fromStockPieces: number;
  toSourcePieces: number;
  fullyAvailableFromStock: boolean;
  unitPricePerPiece: number;
  estimatedCost: number;
  /** Cost of only the part that can ship from current stock. */
  fromStockCost: number;
  /** Cost of the part that has to be sourced separately. */
  toSourceCost: number;
};

const toPositiveNumber = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

export const resolveBaseArea = (input: FloorPlanInput): number => {
  const total = toPositiveNumber(input.totalAreaSqm);
  if (total > 0) return total;

  const length = toPositiveNumber(input.lengthM);
  const width = toPositiveNumber(input.widthM);
  return length > 0 && width > 0 ? length * width : 0;
};

export const calculateFloorPlan = (
  input: FloorPlanInput,
  product: FloorPlanProduct,
): FloorPlanResult => {
  const baseAreaSqm = resolveBaseArea(input);
  const wastagePercent = Math.min(50, Math.max(0, input.wastagePercent ?? DEFAULT_WASTAGE_PERCENT));
  const requiredAreaSqm = baseAreaSqm * (1 + wastagePercent / 100);

  const quantity = calculateTileQuantity(requiredAreaSqm, product);
  const available = Math.max(0, product.availablePieces);
  const fromStockPieces = Math.min(available, quantity.totalPieces);
  const toSourcePieces = quantity.totalPieces - fromStockPieces;

  // Priced by area, not by the box: one piece covers `tileArea` m², so its
  // price is just that share of the per-m² price — mirrors the server
  // (`calculator.service.ts`), which bills the whole line the same way.
  const unitPricePerPiece = product.price * product.tileArea;

  return {
    baseAreaSqm,
    wastagePercent,
    requiredAreaSqm,
    completeBoxes: quantity.completeBoxes,
    remainingPieces: quantity.remainingPieces,
    totalPieces: quantity.totalPieces,
    purchasedAreaSqm: quantity.purchasedArea,
    fromStockPieces,
    toSourcePieces,
    fullyAvailableFromStock: toSourcePieces === 0,
    unitPricePerPiece,
    estimatedCost: quantity.totalPieces * unitPricePerPiece,
    fromStockCost: fromStockPieces * unitPricePerPiece,
    toSourceCost: toSourcePieces * unitPricePerPiece,
  };
};
