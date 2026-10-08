import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createInstance } from "i18next";
import { csvCell, stockMovementDocument, stockReportDocument, stockDocumentCsv } from "../src/lib/stock-report-export.ts";

const resources = Object.fromEntries(["en", "rw"].map(locale => [locale, { translation: JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${locale}/common.json`, import.meta.url), "utf8")) }]));
const i18n = createInstance();
await i18n.init({ lng: "en", fallbackLng: false, resources, interpolation: { escapeValue: false } });
const t = i18n.getFixedT("en");
const meta = { generatedAt: "2026-10-08T12:00:00Z", from: "2026-09-09T00:00:00Z", to: "2026-10-09T00:00:00Z", period: "MONTHLY", movementType: "OUTBOUND" };
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
  assert.deepEqual(report.tables.map(table => table.kind), ["summary", "trend", "movements", "lowStock", "fulfillment"]);
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
