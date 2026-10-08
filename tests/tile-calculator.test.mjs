import assert from "node:assert/strict";
import test from "node:test";
import { calculateTileQuantity } from "../src/lib/tile-calculator.ts";

const packaging = { tileArea: 0.09, boxCoverage: 1.44, piecesPerBox: 16 };

test("exact decimal tile boundaries do not add a piece", () => {
  for (const [area, pieces] of [[0.27, 3], [1.08, 12], [1.35, 15], [2.07, 23]]) {
    assert.equal(calculateTileQuantity(area, packaging).totalPieces, pieces);
  }
});

test("an actual fraction of a tile still rounds up", () => {
  assert.equal(calculateTileQuantity(0.270001, packaging).totalPieces, 4);
});

test("exact decimal box boundaries produce complete boxes", () => {
  const quantity = calculateTileQuantity(0.3, { tileArea: 0.1, boxCoverage: 0.1, piecesPerBox: 1 });
  assert.equal(quantity.completeBoxes, 3);
  assert.equal(quantity.remainingPieces, 0);
});

test("combined floor and baseboard cart quantities agree with the server estimate", () => {
  const quantity = calculateTileQuantity(36.54, packaging);
  assert.equal(quantity.totalPieces, 406);
  assert.equal(quantity.completeBoxes, 25);
  assert.equal(quantity.remainingPieces, 6);
  assert.equal(quantity.purchasedArea, 36.54);
});
