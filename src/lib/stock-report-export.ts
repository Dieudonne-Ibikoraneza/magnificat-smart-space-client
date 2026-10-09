import type {
  StockExportMetadata,
  StockMovement,
  StockMovementsExport,
  StockReportExport,
  StockValuationRow,
} from "@/lib/api/types";

export type ExportCell = string | number;
export type ExportTable = {
  kind:
    | "summary"
    | "trend"
    | "movements"
    | "lowStock"
    | "fulfillment"
    | "valuation";
  title: string;
  headers: string[];
  rows: ExportCell[][];
};
export type StockExportDocument = {
  title: string;
  filename: string;
  metadata: [string, ExportCell][];
  notes: string[];
  tables: ExportTable[];
};
type Translate = (key: string) => string;
const key = (name: string) => `stock.reports.output.${name}`;
const numeric = (value: unknown): ExportCell => {
  if (value == null) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
};
const isoDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
};

function movementTable(items: StockMovement[], t: Translate): ExportTable {
  return {
    kind: "movements",
    title: t("stock.reports.stockMovements"),
    headers: [
      t(key("date")),
      t("stock.reports.colItem"),
      t(key("sku")),
      t("stock.reports.colType"),
      t("stock.reports.colQty"),
      t("stock.reports.colBy"),
      t(key("reference")),
      t(key("reason")),
    ],
    rows: items.map((row) => [
      isoDate(row.createdAt),
      row.product.name,
      row.product.sku,
      t(`staff.movementType.${row.type}`),
      numeric(row.changeAreaSqm),
      row.adjustedBy?.fullName ?? "",
      row.reference ?? "",
      row.reason ?? "",
    ]),
  };
}

function valuationTable(items: StockValuationRow[], t: Translate): ExportTable {
  return {
    kind: "valuation",
    title: t(key("valuation")),
    headers: [
      t("stock.reports.colItem"),
      t(key("sku")),
      t(key("size")),
      t(key("status")),
      t(key("currentStock")),
      t(key("averageCost")),
      t(key("stockValue")),
    ],
    rows: items.map((row) => [
      row.name,
      row.sku,
      row.size,
      t(key(row.isActive ? "tileActive" : "tileInactive")),
      numeric(row.quantityOnHandSqm),
      numeric(row.averageCostPrice),
      numeric(row.inventoryValue),
    ]),
  };
}

function metadata(
  snapshot: StockExportMetadata,
  count: number,
  t: Translate,
): [string, ExportCell][] {
  const filters = {
    ALL: "filterAll",
    INBOUND: "filterInbound",
    OUTBOUND: "filterOutbound",
    ADJUSTMENT: "filterAdjustment",
  };
  return [
    [t(key("generated")), isoDate(snapshot.generatedAt)],
    [
      t(key("exportScope")),
      snapshot.tile
        ? `${snapshot.tile.name} · ${snapshot.tile.sku}`
        : snapshot.collection
          ? `${t(key("collection"))}: ${snapshot.collection.title} · ${snapshot.collection.size}`
          : t(key("allTiles")),
    ],
    [t(key("from")), isoDate(snapshot.from)],
    [t(key("to")), isoDate(snapshot.to)],
    [t(key("filter")), t(`stock.reports.${filters[snapshot.movementType]}`)],
    [t(key("records")), count],
  ];
}

function filename(
  snapshot: StockExportMetadata,
  scope: "report" | "movements",
) {
  const lastDay = new Date(new Date(snapshot.to).getTime() - 1)
    .toISOString()
    .slice(0, 10);
  const tile = snapshot.tile
    ? `-tile-${snapshot.tile.id.replace(/[^a-zA-Z0-9-]/g, "")}`
    : "";
  const collection = snapshot.collection
    ? `-collection-${snapshot.collection.id.replace(/[^a-zA-Z0-9-]/g, "")}`
    : "";
  return `stock-${scope}${tile}${collection}-${snapshot.from.slice(0, 10)}-${lastDay}-${snapshot.movementType.toLowerCase()}.csv`;
}

export function stockMovementDocument(
  snapshot: StockMovementsExport,
  t: Translate,
): StockExportDocument {
  return {
    title: t("stock.reports.stockMovements"),
    filename: filename(snapshot, "movements"),
    metadata: metadata(snapshot, snapshot.items.length, t),
    notes: [t(key("completeMovements")), t(key("valuationNote"))],
    tables: [
      movementTable(snapshot.items, t),
      valuationTable(snapshot.valuation, t),
    ],
  };
}

export function stockReportDocument(
  snapshot: StockReportExport,
  t: Translate,
): StockExportDocument {
  const summary = snapshot.summary;
  const adjustments =
    summary.byType.find((row) => row.type === "ADJUSTMENT")?.movements ?? 0;
  const table: ExportTable = {
    kind: "summary",
    title: t("stock.reports.summaryTitle"),
    headers: [t(key("metric")), t(key("value")), t(key("unit"))],
    rows: [
      [t("stock.reports.totalInbound"), numeric(summary.totalInbound), "m²"],
      [t("stock.reports.totalOutbound"), numeric(summary.totalOutbound), "m²"],
      [t("stock.reports.netChange"), numeric(summary.netChange), "m²"],
      [t("stock.reports.adjustments"), adjustments, t(key("records"))],
      [
        t("stock.overview.totalInventoryValue"),
        numeric(summary.totalInventoryValue),
        "RWF",
      ],
      [
        t("stock.overview.activeProducts"),
        summary.activeProducts,
        t(key("products")),
      ],
      [
        t("stock.overview.lowStockItems"),
        summary.lowStockItems,
        t(key("products")),
      ],
      [
        t("stock.reports.outOfStockItems"),
        summary.outOfStockItems,
        t(key("products")),
      ],
      [
        t("stock.overview.pendingFulfillments"),
        snapshot.fulfillment.byStatus.reduce((sum, row) => sum + row.count, 0),
        t(key("orders")),
      ],
    ],
  };
  return {
    title: t("stock.reports.tabStockReport"),
    filename: filename(snapshot, "report"),
    metadata: metadata(snapshot, snapshot.movements.length, t),
    notes: [
      t(key("scopeNote")),
      t(key("summaryScope")),
      t(key("completeMovements")),
      t(key("valuationNote")),
    ],
    tables: [
      table,
      valuationTable(snapshot.valuation, t),
      {
        kind: "trend",
        title: t("stock.reports.trendTitle"),
        headers: [t(key("date")), t("stock.reports.colQty")],
        rows: summary.trend.map((row) => [row.label, numeric(row.value)]),
      },
      movementTable(snapshot.movements, t),
      {
        kind: "lowStock",
        title: t("stock.reports.lowStockReportTitle"),
        headers: [
          t("stock.reports.colItem"),
          t(key("sku")),
          t("stock.reports.colQty"),
          t("stock.reports.colThreshold"),
          t(key("status")),
          t(key("size")),
        ],
        rows: snapshot.lowStock.map((row) => [
          row.name,
          row.sku,
          numeric(row.quantityOnHandSqm),
          numeric(row.lowStockThreshold),
          t(`product.stock.${row.stockStatus}`),
          row.size,
        ]),
      },
      {
        kind: "fulfillment",
        title: t("stock.overview.fulfillmentQueue"),
        headers: [
          t(key("order")),
          t(key("customer")),
          t(key("status")),
          t(key("date")),
          t(key("items")),
          t(key("pieces")),
        ],
        rows: snapshot.fulfillment.orders.map((row) => [
          row.orderNumber,
          row.customer?.fullName ?? "",
          t(`staff.orderStatus.${row.status}`),
          isoDate(row.createdAt),
          row.items?.length ?? 0,
          row.items?.reduce(
            (sum, item) => sum + (Number(item.totalPieces) || 0),
            0,
          ) ?? 0,
        ]),
      },
    ],
  };
}

/** RFC-style quoting plus protection against spreadsheet formulas in text fields.
 * Signed numeric movement quantities retain their numeric value. */
export function csvCell(value: ExportCell) {
  let text = String(value);
  if (typeof value === "string" && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function stockDocumentCsv(document: StockExportDocument, t: Translate) {
  const headers = [
    "section",
    "date",
    "sku",
    "reference",
    "metric",
    "status",
    "value",
    "unit",
    "threshold",
    "size",
    "person",
    "reason",
  ];
  const rows: ExportCell[][] = [headers.map((name) => t(key(name)))];
  for (const [label, value] of document.metadata)
    rows.push([
      document.title,
      "",
      "",
      "",
      label,
      "",
      value,
      "",
      "",
      "",
      "",
      "",
    ]);
  for (const note of document.notes)
    rows.push([document.title, "", "", "", "", "", "", "", "", "", "", note]);
  for (const table of document.tables)
    for (const row of table.rows) {
      switch (table.kind) {
        case "valuation":
          for (const [metric, value, unit] of [
            [t(key("currentStock")), row[4], "m²"],
            [t(key("averageCost")), row[5], "RWF/m²"],
            [t(key("stockValue")), row[6], "RWF"],
          ] as ExportCell[][]) {
            rows.push([
              table.title,
              "",
              row[1],
              "",
              `${row[0]} — ${metric}`,
              row[3],
              value,
              unit,
              "",
              row[2],
              "",
              "",
            ]);
          }
          break;
        case "summary":
          rows.push([
            table.title,
            "",
            "",
            "",
            row[0],
            "",
            row[1],
            row[2],
            "",
            "",
            "",
            "",
          ]);
          break;
        case "trend":
          rows.push([
            table.title,
            row[0],
            "",
            "",
            t("stock.reports.netChange"),
            "",
            row[1],
            "m²",
            "",
            "",
            "",
            "",
          ]);
          break;
        case "movements":
          rows.push([
            table.title,
            row[0],
            row[2],
            row[6],
            row[1],
            row[3],
            row[4],
            "m²",
            "",
            "",
            row[5],
            row[7],
          ]);
          break;
        case "lowStock":
          rows.push([
            table.title,
            "",
            row[1],
            "",
            row[0],
            row[4],
            row[2],
            "m²",
            row[3],
            row[5],
            "",
            "",
          ]);
          break;
        case "fulfillment":
          rows.push([
            table.title,
            row[3],
            "",
            row[0],
            "",
            row[2],
            row[4],
            t(key("items")),
            "",
            "",
            row[1],
            `${t(key("pieces"))}: ${row[5]}`,
          ]);
          break;
      }
    }
  // UTF-8 BOM lets spreadsheet applications identify Kinyarwanda and m² correctly.
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
