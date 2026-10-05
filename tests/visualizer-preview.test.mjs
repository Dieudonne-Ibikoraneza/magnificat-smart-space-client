import assert from "node:assert/strict";
import test from "node:test";
import {
  loadVisualizerPreview,
  resolvePreviewRoom,
} from "../src/lib/visualizer-preview.ts";

const tile = (id, suitableFor = "BOTH", roomTypes = ["BATHROOM"]) => ({
  id,
  isActive: true,
  suitableFor,
  roomTypes,
});

test("a product-details link without a room loads its exact tile and picks a compatible room", async () => {
  const requested = tile("older-tile", "FLOOR");
  const calls = [];
  const preview = await loadVisualizerPreview(
    requested.id,
    null,
    async (id) => {
      calls.push(id);
      return requested;
    },
  );
  assert.deepEqual(calls, ["older-tile"]);
  assert.equal(preview.floor, requested);
  assert.equal(preview.walls, null);
  assert.equal(
    resolvePreviewRoom(null, ["KITCHEN", "BATHROOM"], preview),
    "BATHROOM",
  );
});

test("wall-only links resolve their tile without depending on floor picker results", async () => {
  const requested = tile("wall-tile", "WALL");
  const preview = await loadVisualizerPreview(
    null,
    requested.id,
    async () => requested,
  );
  assert.equal(preview.floor, null);
  assert.equal(preview.walls, requested);
  assert.equal(
    resolvePreviewRoom(null, ["KITCHEN", "BATHROOM"], preview),
    "BATHROOM",
  );
});

test("both-surface links fetch the tile once and apply the same product to both surfaces", async () => {
  let calls = 0;
  const requested = tile("both-tile");
  const preview = await loadVisualizerPreview(
    requested.id,
    requested.id,
    async () => {
      calls++;
      return requested;
    },
  );
  assert.equal(calls, 1);
  assert.equal(preview.floor, requested);
  assert.equal(preview.walls, requested);
});

test("separate floor and wall products require a room compatible with both", async () => {
  const floor = tile("floor", "FLOOR", ["KITCHEN", "BATHROOM"]);
  const walls = tile("walls", "WALL", ["BEDROOM", "BATHROOM"]);
  const preview = await loadVisualizerPreview("floor", "walls", async (id) =>
    id === "floor" ? floor : walls,
  );
  assert.equal(
    resolvePreviewRoom("KITCHEN", ["KITCHEN", "BATHROOM", "BEDROOM"], preview),
    "BATHROOM",
  );
  assert.equal(resolvePreviewRoom(null, ["KITCHEN", "BEDROOM"], preview), null);
});

test("compatible requested rooms take precedence, unavailable rooms fall back safely", () => {
  const preview = {
    floor: tile("floor", "FLOOR", ["KITCHEN", "BATHROOM"]),
    walls: null,
  };
  assert.equal(
    resolvePreviewRoom("BATHROOM", ["KITCHEN", "BATHROOM"], preview),
    "BATHROOM",
  );
  assert.equal(
    resolvePreviewRoom("BEDROOM", ["KITCHEN", "BATHROOM"], preview),
    "KITCHEN",
  );
  assert.equal(resolvePreviewRoom(null, [], preview), null);
});

test("inactive and surface-incompatible tiles are rejected instead of silently substituted", async () => {
  await assert.rejects(
    loadVisualizerPreview("inactive", null, async () => ({
      ...tile("inactive"),
      isActive: false,
    })),
  );
  await assert.rejects(
    loadVisualizerPreview("walls", null, async () => tile("walls", "WALL")),
  );
  await assert.rejects(
    loadVisualizerPreview(null, "floor", async () => tile("floor", "FLOOR")),
  );
});

test("a slow product lookup finishes before the requested selection resolves", async () => {
  let complete;
  let resolved = false;
  const pending = loadVisualizerPreview(
    "slow",
    null,
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  pending.then(() => {
    resolved = true;
  });
  await Promise.resolve();
  assert.equal(resolved, false);
  complete(tile("slow", "FLOOR"));
  assert.equal((await pending).floor.id, "slow");
});

test("missing products preserve the lookup failure so the visualizer can offer retry", async () => {
  const failure = new Error("Product not found");
  await assert.rejects(
    loadVisualizerPreview("missing", null, async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});

test("opening without linked tiles requires no product lookup", async () => {
  const preview = await loadVisualizerPreview(null, null, async () => {
    assert.fail("No product should be fetched");
  });
  assert.deepEqual(preview, { floor: null, walls: null });
  assert.equal(
    resolvePreviewRoom(null, ["KITCHEN", "BEDROOM"], preview),
    "KITCHEN",
  );
});
