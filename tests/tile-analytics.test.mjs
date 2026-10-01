import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Module, { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const i18n = createInstance();
await i18n.init({
  lng: "en",
  resources: {
    en: {
      translation: JSON.parse(
        readFileSync(
          resolve(root, "src/lib/i18n/locales/en/common.json"),
          "utf8",
        ),
      ),
    },
  },
  interpolation: { escapeValue: false },
});
const product = {
  productId: "tile-card",
  name: "Catalogue Tile",
  sku: "SKU-CARD",
  image: "https://example.test/tile.png",
  collection: "Stone",
  size: "40x40",
  roomTypes: ["KITCHEN"],
  suitableFor: "BOTH",
  description: "Tile description",
  quantityOnHandSqm: 100,
  stockStatus: "in_stock",
  viewed: 80,
  applied: 20,
  saved: 7,
  recommended: 35,
  purchased: 8,
  soldAreaSqm: 12.75,
  selectionRate: 25,
  purchaseConversion: 10,
};
const data = {
  period: "MONTHLY",
  leaderboards: { mostViewed: [], mostApplied: [], mostPurchased: [] },
  summary: {
    averageSelectionRate: 25,
    averagePurchaseConversion: 10,
    totalViews: 80,
  },
  filters: { sizes: ["40x40", "60x60"] },
  previews: {
    mostViewed: [
      { ...product, productId: "old-viewed", name: "Older Global View Leader" },
    ],
    mostLiked: [
      { ...product, productId: "old-liked", name: "Older Global Like Leader" },
    ],
  },
  table: {
    items: [product],
    meta: { page: 1, limit: 10, total: 21, totalPages: 3 },
  },
};
let activeSort = "viewed_desc";
let activeFilters;
let requests = [];
const element = (tag) => function TestElement({ children, className, href, ...props }) {
    return React.createElement(
      tag,
      {
        className,
        ...(href ? { href } : {}),
        ...(props.id ? { id: props.id } : {}),
      },
      children,
    );
};
const ui = new Proxy(
  {},
  {
    get: (_, name) => {
      if (name === "SelectValue") return () => null;
      const tags = {
        Table: "table",
        TableHeader: "thead",
        TableBody: "tbody",
        TableRow: "tr",
        TableHead: "th",
        TableCell: "td",
      };
      return element(tags[name] ?? "div");
    },
  },
);
const loaded = new Map();
const loadSource = (relativePath) => {
  const filename = resolve(root, relativePath);
  if (loaded.has(filename)) return loaded.get(filename);
  const compiled = new Module(filename);
  const require = createRequire(filename);
  compiled.require = (id) => {
    if (id === "react")
      return {
        ...React,
        useState: (initial) =>
          React.useState(
            initial === "viewed_desc"
              ? activeSort
              : initial &&
                  typeof initial === "object" &&
                  "Room type" in initial &&
                  activeFilters
                ? activeFilters
                : initial,
          ),
      };
    if (id === "react-i18next")
      return { useTranslation: () => ({ t: i18n.t.bind(i18n) }) };
    if (id === "next/link") return { __esModule: true, default: element("a") };
    if (id === "next/image")
      return {
        __esModule: true,
        default: ({ src, alt }) => React.createElement("img", { src, alt }),
      };
    if (id.startsWith("@/components/ui/")) return ui;
    if (id === "@/components/dashboard-page-headers")
      return { DashboardPageHeader: element("header") };
    if (id === "@/components/product-catalog")
      return { FilterOptionsCard: () => null };
    if (id === "@/components/analytics-period-switcher")
      return {
        AnalyticsPeriodSwitcher: () => null,
        periodToRange: { 7: "WEEKLY", 30: "MONTHLY", 365: "YEARLY" },
      };
    if (id === "@/lib/api")
      return {
        analyticsApi: {
          tiles: (query) => {
            requests.push(query);
            return data;
          },
        },
      };
    if (id === "@/lib/api/use-api")
      return {
        useApi: (fetcher) => ({
          data: fetcher(),
          loading: false,
          reload: () => {},
        }),
      };
    if (id.startsWith("@/")) {
      const base = `src/${id.slice(2)}`;
      return loadSource(
        `${base}${existsSync(resolve(root, `${base}.tsx`)) ? ".tsx" : ".ts"}`,
      );
    }
    return require(id);
  };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  compiled._compile(outputText, filename);
  loaded.set(filename, compiled.exports);
  return compiled.exports;
};
const renderPage = (area, sort = "viewed_desc", filters) => {
  activeSort = sort;
  activeFilters = filters;
  requests = [];
  const path = area === "admin" ? "admin/analytics" : "analytics";
  const Page = loadSource(`src/app/[lang]/${path}/tiles/page.tsx`).default;
  return renderToStaticMarkup(React.createElement(Page));
};

for (const area of ["admin", "analytics"]) {
  for (const [sort, labels] of [
    ["recommended_desc", ["35 recommendations", "25.0% selection"]],
    ["recommended_asc", ["35 recommendations", "25.0% selection"]],
    ["applied_desc", ["20 Applications", "10.0% purchase conversion"]],
    ["applied_asc", ["20 Applications", "10.0% purchase conversion"]],
    ["selectionRate_desc", ["20 Applications", "25.0% selection"]],
    ["selectionRate_asc", ["20 Applications", "25.0% selection"]],
    ["purchased_desc", ["8 purchases", "12.75 sqm sold"]],
    ["purchased_asc", ["8 purchases", "12.75 sqm sold"]],
    ["saved_desc", ["80 views", "7 likes"]],
  ]) {
    test(`${area}: ${sort} renders the matching card metrics and sends the server sort`, () => {
      const html = renderPage(area, sort);
      const card = html.match(/<article class="group[\s\S]*?<\/article>/)?.[0];
      assert.ok(card, "product card rendered");
      for (const label of labels) assert.ok(card.includes(label), label);
      if (sort.startsWith("selectionRate_"))
        assert.ok(!card.includes("purchase conversion"));
      const base = area === "admin" ? "/admin/inventory" : "/analytics/tiles";
      assert.ok(card.includes(`href="${base}/tile-card"`));
      assert.equal(requests[1].sort, sort);
      assert.ok(html.includes("Older Global View Leader"));
      assert.ok(html.includes("Older Global Like Leader"));
      assert.equal(html.includes('href="/admin/inventory"'), area === "admin");
      if (area === "analytics") assert.ok(!html.includes('href="/admin/'));
    });
  }
  test(`${area}: catalogue filter selections are sent together to the paginated API`, () => {
    renderPage(area, "viewed_desc", {
      "Room type": ["Kitchen"],
      "Suitable for": ["Floor"],
      Size: ["40x40"],
      Availability: ["Low Stock"],
    });
    assert.deepEqual(requests[1], {
      period: "MONTHLY",
      page: 1,
      limit: 10,
      search: undefined,
      sort: "viewed_desc",
      roomTypes: "KITCHEN",
      suitableFor: "FLOOR,BOTH",
      sizes: "40x40",
      stockStatuses: "low_stock",
    });
    assert.deepEqual(requests[0], { period: "MONTHLY", limit: 1 });
  });
}
