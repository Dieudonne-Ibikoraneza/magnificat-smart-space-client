import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { cn, isFiniteNumber } from "../src/lib/utils.ts";
import { toProduct } from "../src/lib/api/mappers.ts";

const require = createRequire(import.meta.url);
const componentModule = { exports: {} };
const source = readFileSync(new URL("../src/components/product-stock-quantity.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
new Function("exports", "require", "module", compiled)(componentModule.exports, (name) => {
  if (name === "@/lib/utils") return { cn, isFiniteNumber };
  if (name === "react-i18next") return { useTranslation: () => ({ t: () => "On hand" }) };
  return require(name);
}, componentModule);
const renderQuantity = (quantity) => renderToStaticMarkup(React.createElement(componentModule.exports.ProductStockQuantity, { quantity }));
const product = {
  id: "tile", name: "Tile", sku: "TILE", collectionId: "collection", size: "30×30cm",
  boxCoverageSqm: 1.44, tileAreaSqm: 0.09, piecesPerBox: 16, price: "1000", image: "tile.webp",
  stockStatus: "in_stock", roomTypes: [], suitableFor: "FLOOR",
};

test("mapped sales catalog products retain physical stock quantity", () => {
  const mapped = toProduct({ ...product, quantityOnHandSqm: 10.1234 });
  assert.equal(mapped.quantityOnHandSqm, 10.1234);
  assert.match(renderQuantity(mapped.quantityOnHandSqm), /On hand/);
  assert.match(renderQuantity(mapped.quantityOnHandSqm), /10\.1234/);
  assert.match(renderQuantity(mapped.quantityOnHandSqm), /m²/);
});

test("public product responses do not invent a stock count", () => {
  assert.equal(toProduct(product).quantityOnHandSqm, undefined);
  assert.equal(renderQuantity(toProduct(product).quantityOnHandSqm), "");
});

test("zero is an actual stock balance, while missing and malformed quantities remain hidden", () => {
  assert.match(renderQuantity(0), /0 m²/);
  for (const quantity of [undefined, null, NaN, Infinity]) assert.equal(renderQuantity(quantity), "");
});

test("stock display remains read-only and contains no inventory cost information", () => {
  const html = renderQuantity(10);
  assert.doesNotMatch(html, /button|input|RWF|cost|value|reserved/i);
});
