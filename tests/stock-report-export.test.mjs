import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createInstance } from "i18next";
import { csvCell, stockMovementDocument, stockReportDocument, stockDocumentCsv } from "../src/lib/stock-report-export.ts";
import { matchesExportTile } from "../src/lib/stock-export-filters.ts";

const resources = Object.fromEntries(["en", "rw"].map(locale => [locale, { translation: JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${locale}/common.json`, import.meta.url), "utf8")) }]));
const i18n = createInstance();
await i18n.init({ lng: "en", fallbackLng: false, resources, interpolation: { escapeValue: false } });
const t = i18n.getFixedT("en");

test("tile search matches names, SKUs and sizes with case-insensitive words and x/× formats", () => {
  const tile = { name: "Slate Blue Granite", sku: "TILE-055", size: "30×30cm" };
  for (const term of ["", "  ", "slate", "TILE-055", "blue 055", "30x30", "30 × 30"]) assert.equal(matchesExportTile(tile, term), true, term);
  for (const term of ["marble", "40x40", "blue missing"]) assert.equal(matchesExportTile(tile, term), false, term);
});
const meta = { generatedAt: "2026-10-08T12:00:00Z", from: "2026-09-09T00:00:00Z", to: "2026-10-09T00:00:00Z", period: "MONTHLY", movementType: "OUTBOUND", tile: null, valuation: [] };
const items = Array.from({ length: 125 }, (_, index) => ({
  id: `movement-${index}`, createdAt: "2026-10-05T12:00:00Z", type: "OUTBOUND", changeAreaSqm: "-2.5",
  product: { id: "tile", name: index === 0 ? 'Tile, "Ceramic" <script>' : `Tile ${index}`, sku: `SKU-${index}` },
  adjustedBy: { id: "staff", fullName: "Stock Manager" }, reference: index === 0 ? '=HYPERLINK("bad")' : `REF-${index}`,
  reason: index === 0 ? "First line\nSecond line" : "Dispatch",
}));
const summary = { ...meta, totalInbound: 30, totalOutbound: -20, netChange: 10, activeProducts: 3,
  lowStockItems: 1, outOfStockItems: 1, totalInventoryValue: 50000,
  trend: [{ label: "Oct 05", value: -2.5 }], byType: [{ type: "ADJUSTMENT", movements: 2, areaSqm: 5 }] };
const snapshot = { ...meta, summary, movements: items,
  lowStock: [{ name: "Low tile", sku: "LOW", quantityOnHandSqm: 5, lowStockThreshold: 20, stockStatus: "low_stock", size: "30×30cm" }],
  fulfillment: { byStatus: [{ status: "PENDING", count: 1 }], orders: [{ orderNumber: "ORD-PRINT", status: "PENDING", createdAt: meta.generatedAt, customer: { fullName: "Customer" }, items: [{ totalPieces: 4 }] }] } };

const require = createRequire(import.meta.url);
const component = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL("../src/components/stock-report-document.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
new Function("exports", "require", "module", code)(component.exports, require, component);
const render = (report) => renderToStaticMarkup(React.createElement(component.exports.StockReportDocument, { report, emptyLabel: "No records" }));

function parseCsv(csv) {
  const rows = [], row = [];
  let cell = "", quoted = false;
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (index === 0 && char === "\uFEFF") continue;
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && char === ",") { row.push(cell); cell = ""; }
    else if (!quoted && char === "\r" && csv[index + 1] === "\n") {
      row.push(cell); rows.push([...row]); row.length = 0; cell = ""; index++;
    } else cell += char;
  }
  row.push(cell); rows.push([...row]);
  return rows;
}

test("the movement print document includes all supplied records and absolute timestamps", () => {
  const report = stockMovementDocument({ ...meta, items }, t);
  assert.equal(report.tables[0].rows.length, 125);
  const html = render(report);
  assert.match(html, /SKU-124/);
  assert.match(html, /2026-10-05T12:00:00.000Z/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<button|<input/);
});

test("CSV is rectangular, UTF-8 compatible, and preserves signed quantities and multiline text", () => {
  const csv = stockDocumentCsv(stockMovementDocument({ ...meta, items }, t), t);
  assert.equal(csv[0], "\uFEFF");
  const rows = parseCsv(csv);
  assert.ok(rows.every(row => row.length === 12));
  const movements = rows.filter(row => row[0] === "Stock Movements" && row[2].startsWith("SKU-"));
  assert.equal(movements.length, 125);
  assert.equal(movements[0][6], "-2.5");
  assert.equal(movements[0][4], 'Tile, "Ceramic" <script>');
  assert.equal(movements[0][11], "First line\nSecond line");
  assert.equal(movements[0][3], '\'=HYPERLINK("bad")');
});

test("text formulas are neutralized while numeric outbound quantities remain numbers", () => {
  for (const value of ["=SUM(1,2)", "+CMD", "-COMMAND", "@FUNCTION", "\t=SUM(1,2)"]) assert.match(csvCell(value), /^"'/);
  assert.equal(csvCell(-2.5), '"-2.5"');
});

test("a stock report includes summary, trend, movements, low stock and fulfilment", () => {
  const report = stockReportDocument(snapshot, t);
  assert.deepEqual(report.tables.map(table => table.kind), ["summary", "valuation", "trend", "movements", "lowStock", "fulfillment"]);
  const csv = stockDocumentCsv(report, t);
  assert.match(csv, /50000/);
  assert.match(csv, /LOW/);
  assert.match(csv, /ORD-PRINT/);
  assert.match(csv, /SKU-124/);
  const html = render(report);
  assert.match(html, /ORD-PRINT/);
  assert.match(html, /Low tile/);
  assert.match(html, /SKU-124/);
});

test("filenames and metadata retain the captured window and filter", () => {
  const report = stockMovementDocument({ ...meta, items }, t);
  assert.equal(report.filename, "stock-movements-2026-09-09-2026-10-08-outbound.csv");
  assert.ok(report.metadata.some(([, value]) => value === "Outbound"));
  assert.ok(report.metadata.some(([, value]) => value === 125));
});

test("empty report sections and both locales have readable output", () => {
  for (const locale of ["en", "rw"]) {
    const translate = i18n.getFixedT(locale);
    const report = stockReportDocument({ ...snapshot, movements: [], lowStock: [], fulfillment: { byStatus: [], orders: [] } }, translate);
    const csv = stockDocumentCsv(report, translate);
    assert.doesNotMatch(csv, /stock\.reports\.|stock\.overview\.|staff\./);
    assert.match(render(report), /No records/);
  }
});


test("single-tile exports identify their scope and include current stock valuation in print and CSV", () => {
  const tile = { id: "tile-uuid", name: 'Tile, "Ceramic"', sku: "SINGLE", size: "30×30cm", isActive: true };
  const valuation = [{ productId: tile.id, name: tile.name, sku: tile.sku, size: tile.size, isActive: true,
    quantityOnHandSqm: "12.3456", averageCostPrice: "2500.5", inventoryValue: 30870.1728 }];
  for (const report of [stockReportDocument({ ...snapshot, tile, valuation }, t), stockMovementDocument({ ...meta, tile, valuation, items: [] }, t)]) {
    assert.match(report.filename, /tile-tile-uuid/);
    assert.ok(report.metadata.some(([, value]) => value === `${tile.name} · SINGLE`));
    const table = report.tables.find((row) => row.kind === "valuation");
    assert.equal(table.rows.length, 1);
    assert.deepEqual(table.rows[0].slice(4), [12.3456, 2500.5, 30870.1728]);
    const html = render(report);
    assert.match(html, /Current Stock Valuation/);
    assert.match(html, /12.3456/);
    const csv = parseCsv(stockDocumentCsv(report, t));
    assert.ok(csv.every(row => row.length === 12));
    const stock = csv.filter(row => row[0] === "Current Stock Valuation" && row[2] === "SINGLE");
    assert.equal(stock.length, 3);
    assert.deepEqual(stock.map(row => [row[6], row[7]]), [["12.3456", "m²"], ["2500.5", "RWF/m²"], ["30870.1728", "RWF"]]);
  }
});

test("empty movement periods still show zero stock and valuation with localized labels", () => {
  for (const lang of ["en", "rw"]) {
    const translate = i18n.getFixedT(lang);
    const report = stockMovementDocument({ ...meta, items: [], valuation: [{ productId: "tile", name: "Tile", sku: "ZERO", size: "30×30cm", isActive: false, quantityOnHandSqm: 0, averageCostPrice: 0, inventoryValue: 0 }] }, translate);
    assert.deepEqual(report.tables.find(row => row.kind === "valuation").rows[0].slice(4), [0, 0, 0]);
    assert.doesNotMatch(stockDocumentCsv(report, translate), /stock\.reports\.output\.|staff\.inventory/);
  }
});


test("collection export metadata, filenames and valuation tables retain the whole collection scope", () => {
  const collection = { id: "collection-uuid", title: "Floor Tiles", size: "30×30cm", isActive: true, productCount: 2 };
  const valuation = [0, 1].map(index => ({ productId: `tile-${index}`, name: `Tile ${index}`, sku: `COL-${index}`, size: "30×30cm", isActive: index === 0, quantityOnHandSqm: 5, averageCostPrice: 4, inventoryValue: 20 }));
  for (const report of [stockReportDocument({ ...snapshot, tile: null, collection, valuation }, t), stockMovementDocument({ ...meta, tile: null, collection, valuation, items: [] }, t)]) {
    assert.match(report.filename, /collection-collection-uuid/);
    assert.ok(report.metadata.some(([, value]) => value === "Collection: Floor Tiles · 30×30cm"));
    assert.equal(report.tables.find(table => table.kind === "valuation").rows.length, 2);
    const rows = parseCsv(stockDocumentCsv(report, t));
    assert.equal(rows.filter(row => row[0] === "Current Stock Valuation" && row[2].startsWith("COL-")).length, 6);
    assert.match(render(report), /Floor Tiles/);
  }
});
