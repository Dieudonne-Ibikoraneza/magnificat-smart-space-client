import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BASEBOARD_OPTIONS,
  baseboardInputErrorKey,
  baseboardRequest,
  calculatorPurchaseArea,
} from "../src/lib/baseboard-options.ts";

const options = { ...DEFAULT_BASEBOARD_OPTIONS, enabled: true, perimeterM: "22", openingsWidthM: "1" };

test("product details require a perimeter instead of guessing it from surface area", () => {
  assert.equal(baseboardInputErrorKey({ ...options, perimeterM: "" }, true), "calculator.baseboard.enterPerimeter");
  assert.equal(baseboardInputErrorKey({ ...options, perimeterM: "" }, false), null);
  assert.equal(baseboardInputErrorKey({ ...options, heightCm: "0" }, true), "calculator.baseboard.enterHeight");
});

test("detail-page requests use an independent baseboard allowance", () => {
  assert.deepEqual(baseboardRequest(options, true, true), {
    heightCm: 10, perimeterM: 22, openingsWidthM: 1, cutWidthMm: 3, wastagePercent: 10,
  });
  assert.equal(baseboardRequest(options, false).wastagePercent, undefined);
  assert.equal(baseboardRequest(options, false).perimeterM, undefined);
  assert.equal(baseboardRequest({ ...options, enabled: false }, true), undefined);
});

test("the product cart receives the combined floor and baseboard purchase area", () => {
  assert.equal(calculatorPurchaseArea({ productId: "tile", inputArea: "26", cartAreaSqm: 29.52 }, "tile", "26"), 29.52);
});

test("pending, invalid and stale estimates cannot be used for another cart submission", () => {
  const ready = { productId: "tile", inputArea: "26", cartAreaSqm: 29.52 };
  assert.equal(calculatorPurchaseArea(null, "tile", "26"), null);
  assert.equal(calculatorPurchaseArea({ ...ready, cartAreaSqm: null }, "tile", "26"), null);
  assert.equal(calculatorPurchaseArea(ready, "other-tile", "26"), null);
  assert.equal(calculatorPurchaseArea(ready, "tile", "30"), null);
  for (const cartAreaSqm of [0, -1, Infinity, NaN]) {
    assert.equal(calculatorPurchaseArea({ ...ready, cartAreaSqm }, "tile", "26"), null);
  }
});
