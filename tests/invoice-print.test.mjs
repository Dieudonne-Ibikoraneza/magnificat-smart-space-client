import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Module, { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loaded = new Map();
const loadSource = (relativePath) => {
  const filename = resolve(root, relativePath);
  if (loaded.has(filename)) return loaded.get(filename);
  const compiled = new Module(filename);
  const require = createRequire(filename);
  compiled.require = (id) =>
    id.startsWith("@/")
      ? loadSource(
          `src/${id.slice(2)}${id.includes("/components/") ? ".tsx" : ".ts"}`,
        )
      : require(id);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
    },
  });
  compiled._compile(outputText, filename);
  loaded.set(filename, compiled.exports);
  return compiled.exports;
};

const { InvoiceDocument } = loadSource("src/components/order-invoice.tsx");
const { PrintDocument } = loadSource("src/components/print-document.tsx");
const resources = Object.fromEntries(
  ["en", "rw"].map((locale) => [
    locale,
    {
      translation: JSON.parse(
        readFileSync(
          resolve(root, `src/lib/i18n/locales/${locale}/common.json`),
          "utf8",
        ),
      ),
    },
  ]),
);
const i18n = createInstance();
await i18n.init({
  lng: "en",
  resources,
  interpolation: { escapeValue: false },
});

const fixture = (count = 1) => ({
  id: "order-1",
  orderNumber: "ORD-PRINT-TEST",
  currency: "RWF",
  status: "DELIVERED",
  quotationStatus: "PAYMENT_VERIFIED",
  createdAt: "2026-10-02T12:00:00Z",
  customer: {
    fullName: "Test Customer",
    email: "test@example.test",
    phone: "+250700000000",
  },
  delivery: {
    contactName: "Test Customer",
    address: "Test Street",
    city: "Kigali",
    phone: "+250700000000",
  },
  subtotal: String(287.63 * count),
  transportFee: "1000",
  total: String(287.63 * count + 1000),
  transportFeeNote: "Delivery to Kigali",
  items: Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    product: {
      name: `Tile ${index + 1}: Beige & Grey <Pattern>`,
      sku: `SKU-${index + 1}`,
    },
    requiredAreaSqm: "3.1",
    purchasedAreaSqm: "3.25",
    boxes: 3,
    additionalPieces: 1,
    totalPieces: 13,
    unitPrice: "88.5",
    totalPrice: "287.63",
  })),
});
const renderInvoice = (order = fixture(), locale = "en") =>
  renderToStaticMarkup(
    React.createElement(InvoiceDocument, { order, t: i18n.getFixedT(locale) }),
  );

test("invoice contains order, customer, recorded billed quantity, prices and totals", () => {
  const html = renderInvoice();
  for (const text of [
    "ORD-PRINT-TEST",
    "Test Customer",
    "3.25 m²",
    "3.1",
    "RWF 88.5",
    "RWF 287.63",
    "RWF 1,000",
    "RWF 1,287.63",
    "Payment Verified",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes("Beige &amp; Grey &lt;Pattern&gt;"));
  assert.equal((html.match(/<thead>/g) ?? []).length, 1);
});

test("uncosted transport is clearly labelled rather than shown as zero", () => {
  assert.ok(
    renderInvoice({ ...fixture(), transportFee: null }).includes(
      "Not yet costed",
    ),
  );
});

test("invoice translates its labels into Kinyarwanda", () => {
  const html = renderInvoice(fixture(), "rw");
  assert.ok(html.includes("Inyemezabuguzi"));
  assert.ok(!html.includes("invoice.paymentStatus"));
});

test("the print portal is safe during server rendering", () => {
  assert.equal(
    renderToStaticMarkup(
      React.createElement(
        PrintDocument,
        { id: "order-invoice-print" },
        "Invoice",
      ),
    ),
    "",
  );
});

// Optional fixtures use the actual component and print CSS for browser-to-PDF QA.
if (process.env.INVOICE_PRINT_FIXTURES_DIR) {
  const dir = process.env.INVOICE_PRINT_FIXTURES_DIR;
  mkdirSync(dir, { recursive: true });
  const styles = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
  const printCss = styles.slice(
    styles.indexOf(".print-document {"),
    styles.indexOf("@keyframes like-pop"),
  );
  for (const [name, count, locale] of [
    ["invoice-short", 1, "en"],
    ["invoice-long", 45, "en"],
    ["invoice-rw", 1, "rw"],
  ]) {
    writeFileSync(
      resolve(dir, `${name}.html`),
      `<!doctype html><html><head><meta charset="utf-8"><style>${printCss}</style></head><body><main style="height:100vh;overflow:hidden">DASHBOARD MUST NOT PRINT</main><div id="order-invoice-print" class="print-document">${renderInvoice(fixture(count), locale)}</div></body></html>`,
    );
  }
  writeFileSync(
    resolve(dir, "quotation.html"),
    `<!doctype html><html><head><style>${printCss}</style></head><body><main>DASHBOARD MUST NOT PRINT</main><div id="quotation-print" class="print-document"><h1>Cart quotation</h1><p>Test Customer</p><p>RWF 1,287.63</p></div></body></html>`,
  );
}
