import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { formatCompactCurrency, isFiniteNumber } from "../src/lib/utils.ts";

// Load the real JSX component in Node while resolving its client-only alias.
const require = createRequire(import.meta.url);
const componentModule = { exports: {} };
const source = readFileSync(new URL("../src/components/customer-spend-row.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function("exports", "require", "module", compiled)(componentModule.exports,
  (name) => name === "@/lib/utils" ? { formatCompactCurrency, isFiniteNumber } : require(name), componentModule);
const { CustomerSpendRow } = componentModule.exports;
const renderSpend = (spend) => renderToStaticMarkup(React.createElement(CustomerSpendRow, { spend, label: "Total Spend" }));

test("missing or withheld amounts are unknown, rather than NaN or a fabricated zero", () => {
  for (const amount of [undefined, null, NaN, Infinity, -Infinity]) {
    assert.equal(formatCompactCurrency(amount), "—");
    assert.equal(renderSpend(amount), "");
  }
});

test("a customer with no spending still has a genuine zero when the API supplies it", () => {
  assert.equal(formatCompactCurrency(0), "RWF 0");
  assert.match(renderSpend(0), /Total Spend/);
  assert.match(renderSpend(0), /RWF 0/);
});

test("authorized finite spending remains visible with the existing compact formatting", () => {
  assert.equal(formatCompactCurrency(14500), "RWF 14.5K");
  assert.equal(formatCompactCurrency(128500000), "RWF 128.5M");
  assert.equal(formatCompactCurrency(-2000), "-RWF 2.0K");
  assert.match(renderSpend(14500), /RWF 14\.5K/);
});

test("malformed API amounts cannot render NaN or be coerced into a customer spend", () => {
  for (const amount of ["14500", "invalid", {}, []]) {
    assert.equal(isFiniteNumber(amount), false);
    assert.equal(renderSpend(amount), "");
  }
});
