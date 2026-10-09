/** Tile searches match all words across the name, SKU and size; x and × are equivalent. */
export type StockExportTarget =
  | { kind: "all" }
  | { kind: "tile"; id: string }
  | { kind: "collection"; id: string };

export function matchesExportTile(
  tile: { name: string; sku: string; size: string },
  query: string,
) {
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase()
      .replaceAll("×", "x")
      .replace(/(\d)\s*x\s*(?=\d)/g, "$1x");
  const text = normalize(`${tile.name} ${tile.sku} ${tile.size}`);
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
