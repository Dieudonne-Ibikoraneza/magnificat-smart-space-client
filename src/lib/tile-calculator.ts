export type TilePackaging = {
  tileArea: number;
  boxCoverage: number;
  piecesPerBox: number;
};

export type TileQuantity = TilePackaging & {
  requiredArea: number;
  completeBoxes: number;
  boxArea: number;
  remainingArea: number;
  remainingPieces: number;
  totalPieces: number;
  purchasedArea: number;
};

/** Clears the odd floating-point trailing digit (e.g. 9.6 + 0.4 = 10.000000000000002) that plain arithmetic on areas is prone to, without rounding away genuine precision like 4.8 or 1.5. */
const roundArea = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

export const calculateTileQuantity = (
  requiredArea: number,
  packaging: TilePackaging,
): TileQuantity => {
  const area = Math.max(0, Number.isFinite(requiredArea) ? requiredArea : 0);
  // Use integer area units so an exact tile/box boundary cannot round up
  // or down due to floating-point division. Mirrors the server calculator.
  const completeBoxes = Math.floor(
    Math.round(area * 1_000_000) /
      Math.round(packaging.boxCoverage * 1_000_000),
  );
  const boxArea = roundArea(completeBoxes * packaging.boxCoverage);
  const remainingArea = roundArea(Math.max(0, area - boxArea));
  const remainingPieces = Math.ceil(
    Math.round(remainingArea * 1_000_000) /
      Math.round(packaging.tileArea * 1_000_000),
  );

  return {
    ...packaging,
    requiredArea: area,
    completeBoxes,
    boxArea,
    remainingArea,
    remainingPieces,
    totalPieces: completeBoxes * packaging.piecesPerBox + remainingPieces,
    purchasedArea: roundArea(boxArea + remainingPieces * packaging.tileArea),
  };
};
