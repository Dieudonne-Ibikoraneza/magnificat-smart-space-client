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

export const calculateTileQuantity = (
  requiredArea: number,
  packaging: TilePackaging,
): TileQuantity => {
  const area = Math.max(0, Number.isFinite(requiredArea) ? requiredArea : 0);
  const completeBoxes = Math.floor(area / packaging.boxCoverage);
  const boxArea = completeBoxes * packaging.boxCoverage;
  const remainingArea = Math.max(0, area - boxArea);
  const remainingPieces = Math.ceil(remainingArea / packaging.tileArea);

  return {
    ...packaging,
    requiredArea: area,
    completeBoxes,
    boxArea,
    remainingArea,
    remainingPieces,
    totalPieces: completeBoxes * packaging.piecesPerBox + remainingPieces,
    purchasedArea: boxArea + remainingPieces * packaging.tileArea,
  };
};
