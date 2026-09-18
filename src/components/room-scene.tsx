"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Product } from "@/components/product-card";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * The 3D room viewport (doc 3.5). Room shells are authored as GLBs by
 * `scripts/generate-room-models.mjs`; this only loads one and re-materials the
 * surfaces the customer is allowed to tile.
 *
 * The contract with the generator is two-fold: meshes named `Floor` or `Wall_*`
 * are tileable, and their UVs are in metres rather than 0..1. That second part
 * is what lets a 25×40 cm tile and a 60×60 cm tile both land at their true
 * physical size on any surface — the repeat is just `1 / tileMetres`, with no
 * per-surface bookkeeping.
 */

/** How many times a failed tile-texture fetch retries before the surface is accepted as genuinely untiled — see `useTileTexture`. */
const MAX_TEXTURE_LOAD_RETRIES = 2;
const TEXTURE_RETRY_DELAY_MS = 500;

/** "25×40cm" / "60x60 cm" → metres. Falls back to a square derived from the piece area. */
const tileMetres = (product: Product): [number, number] => {
  const match = product.size.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const width = Number(match[1]) / 100;
    const height = Number(match[2]) / 100;
    if (width > 0 && height > 0) return [width, height];
  }
  const side = Math.sqrt(Math.max(product.tileArea, 0.01));
  return [side, side];
};

/**
 * Loads one tile as a fully configured repeating texture — keyed on the
 * product rather than just its image, because two products can share a photo
 * while tiling at different physical sizes. Kept imperative rather than
 * suspense-based (drei's `useTexture`) so a product whose image 404s or is
 * blocked by CORS just leaves the surface untiled instead of blanking the
 * whole canvas behind an error boundary.
 *
 * `ready` flips true once this product's fetch has settled (texture or
 * failure), so the room loader can wait before revealing the scene — otherwise
 * metre UV rewrites land on the model's atlas for a frame and flash the
 * packed-sprite look.
 */
const useTileTexture = (
  product: Product | undefined,
): { texture: THREE.Texture | null; ready: boolean; tileSize: [number, number] | null } => {
  const productId = product?.id;

  // Switching tiles keeps showing the *previous* one until the new image has
  // actually finished loading, rather than dropping to the untiled surface
  // for the gap — that gap is a real, visible flash (a network fetch takes
  // tens to hundreds of milliseconds), not a one-frame nicety. Deselecting
  // down to no tile is the one case cleared right away, in render rather
  // than from an effect — the same pattern `useApi` uses for its own inputs
  // — since there's no "next" texture to wait for.
  const [loaded, setLoaded] = useState<{
    id: string | undefined;
    texture: THREE.Texture | null;
    tileSize: [number, number] | null;
    ready: boolean;
  }>({
    id: productId,
    texture: null,
    tileSize: null,
    ready: productId === undefined,
  });
  if (productId === undefined && loaded.id !== undefined) {
    setLoaded({ id: undefined, texture: null, tileSize: null, ready: true });
  }

  useEffect(() => {
    if (!product) return;

    let active = true;
    let attempt = 0;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const attemptLoad = () => {
      loader.load(
        product.image,
        (texture) => {
          if (!active) {
            texture.dispose();
            return;
          }
          // Everything the texture needs is set here, at creation, so nothing
          // downstream has to reach back in and mutate it.
          const [width, height] = tileMetres(product);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          texture.repeat.set(1 / width, 1 / height);
          setLoaded({ id: product.id, texture, tileSize: [width, height], ready: true });
        },
        undefined,
        // A single failed fetch is often transient — e.g. the network
        // briefly saturated by several rooms' worth of GLBs and textures
        // loading at once during a quick room switch, not a real 404/CORS
        // block — so this retries a couple of times before accepting
        // "untiled" as final. Without this, one blip left the surface
        // permanently blank for the rest of this mount: nothing about
        // `product` changing again to ever re-trigger this effect.
        () => {
          if (!active) return;
          if (attempt < MAX_TEXTURE_LOAD_RETRIES) {
            attempt += 1;
            window.setTimeout(() => {
              if (active) attemptLoad();
            }, TEXTURE_RETRY_DELAY_MS);
            return;
          }
          setLoaded({ id: product.id, texture: null, tileSize: null, ready: true });
        },
      );
    };
    attemptLoad();

    return () => {
      active = false;
    };
  }, [product]);

  // Textures are GPU allocations, so the outgoing one has to be released by hand.
  useEffect(() => () => loaded.texture?.dispose(), [loaded.texture]);

  // Ready only when the settled entry is for the *current* product — otherwise
  // we're still on the previous tile's texture mid-switch.
  const ready = productId === undefined ? true : loaded.ready && loaded.id === productId;
  return { texture: loaded.texture, ready, tileSize: loaded.tileSize };
};

/**
 * One shared material per surface role — every wall segment tiles identically.
 *
 * `DoubleSide` because a sourced model's surfaces don't necessarily face the
 * way ours do: `modern_kitchen.glb`'s walls are zero-thickness planes whose
 * normals point *out* of the room, and they only read from inside because the
 * model's own materials are double-sided too. Swapping in a front-only
 * material culled them from the customer's viewpoint entirely — the wall
 * simply vanished and you saw straight through it to the shell behind, which
 * looked exactly like "the tile never got applied to the big wall."
 */
/**
 * Real grout width, in metres — thin enough to read as a seam rather than a
 * border, independent of tile size. 3mm is a typical rectified-tile grout
 * joint.
 */
const GROUT_WIDTH_M = 0.003;

/**
 * How much the grout line darkens the tile's own colour at its center (1 =
 * unchanged, 0 = black). Drawn as a shadowed groove rather than a flat paint
 * colour so it reads correctly against any tile photo — dark terrazzo, pale
 * beige, whatever's selected — without a per-product grout-colour field.
 */
const GROUT_DARKEN = 0.4;

/**
 * Source photos for tiles like these (`Terrazzo Tile No Lighting No
 * Border.png`, `Beige Tile Only No Lighting HD.png`) are shot edge-to-edge
 * with no grout baked in, so a repeating texture alone reads as one seamless
 * slab instead of individual tiles. This bakes a thin darkened seam into the
 * material at every tile-repeat boundary via `onBeforeCompile`, using the
 * map's own UV varying (`vMapUv`, not the general `vUv` — three's
 * per-texture UV-channel support means `map_fragment` samples through its
 * own varying) post-`uvTransform` — which, since `useTileTexture` sets
 * `texture.repeat = 1 / tileMetres`, already lands in "tile units" (one
 * integer step per tile) — so `fract(vMapUv)` is the pixel's position
 * within its own tile with no extra tile-size bookkeeping needed here. `fwidth`
 * anti-aliases the line against screen-space derivatives so it doesn't
 * shimmer/moire as the camera moves further from the floor.
 */
const useTileMaterial = (texture: THREE.Texture | null, tileSize: [number, number] | null) => {
  const material = useMemo(() => {
    if (!texture || !tileSize) return null;

    const nextMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const [width, height] = tileSize;
    const groutFractionX = Math.min(GROUT_WIDTH_M / width, 0.45);
    const groutFractionY = Math.min(GROUT_WIDTH_M / height, 0.45);
    nextMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #include <map_fragment>
        #ifdef USE_MAP
        {
          vec2 tileUv = fract(vMapUv);
          vec2 edgeDist = min(tileUv, 1.0 - tileUv);
          vec2 groutFraction = vec2(${groutFractionX.toFixed(6)}, ${groutFractionY.toFixed(6)});
          vec2 aa = max(fwidth(vMapUv), vec2(1e-4));
          vec2 seam = smoothstep(groutFraction - aa, groutFraction + aa, edgeDist);
          float shade = min(seam.x, seam.y);
          diffuseColor.rgb *= mix(${GROUT_DARKEN.toFixed(3)}, 1.0, shade);
        }
        #endif
        `,
      );
    };
    return nextMaterial;
  }, [texture, tileSize]);

  useEffect(() => () => material?.dispose(), [material]);

  return material;
};

const isFloor = (name: string) => name === "Floor";
const isWall = (name: string) => name.startsWith("Wall_");

/**
 * A sourced model can weld unrelated trim into the same mesh as the wall it
 * borders. `modern_kitchen.glb`'s `Structure_Wall_0` is one such mesh: it is
 * the house shell (22.5 m across, ~498 m² of surface) *plus* a separate
 * 24-triangle ring of window reveal (~7 m², sitting exactly on the window at
 * x≈2, z≈-4.7). Handing the customer's tile to the whole mesh put it on that
 * reveal — a few centimetres of jamb either side of the glass — which reads
 * as the tile landing on the window frame rather than on the wall.
 *
 * The two are separate *connected components*, so they can be told apart
 * without hardcoding coordinates: weld the triangles into islands by shared
 * position, then treat an island as trim when it is a negligible fraction of
 * the mesh's largest island. The index buffer is reordered so the tileable
 * islands come first, and two geometry groups let one mesh carry the tile on
 * the wall and its own original material on the trim.
 *
 * Returns the number of leading triangles that are tileable. A mesh that is
 * a single island (every surface our own generator makes) reports all of
 * them and is left untouched.
 */
const TRIM_ISLAND_AREA_FRACTION = 0.05;

const prepareTileableGroups = (geometry: THREE.BufferGeometry): number => {
  const cached = geometry.userData.tileableTriangleCount as number | undefined;
  if (cached !== undefined) return cached;

  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const triangleVertex = (triangle: number, corner: number) =>
    index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner;

  // Union-find over quantised positions, so vertices duplicated at a UV seam
  // still count as joined rather than splitting one surface into many.
  const parent = new Map<string, string>();
  const keyOf = (vertex: number) =>
    `${position.getX(vertex).toFixed(3)},${position.getY(vertex).toFixed(3)},${position.getZ(vertex).toFixed(3)}`;
  const find = (key: string): string => {
    const seen = parent.get(key);
    if (seen === undefined || seen === key) return key;
    const root = find(seen);
    parent.set(key, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };

  const triangleKeys: string[] = [];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const keys = [0, 1, 2].map((corner) => keyOf(triangleVertex(triangle, corner)));
    keys.forEach((key) => {
      if (!parent.has(key)) parent.set(key, key);
    });
    union(keys[0], keys[1]);
    union(keys[1], keys[2]);
    triangleKeys.push(keys[0]);
  }

  const areaByIsland = new Map<string, number>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const islandOf: string[] = [];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    a.fromBufferAttribute(position, triangleVertex(triangle, 0));
    b.fromBufferAttribute(position, triangleVertex(triangle, 1));
    c.fromBufferAttribute(position, triangleVertex(triangle, 2));
    const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
    const island = find(triangleKeys[triangle]);
    islandOf.push(island);
    areaByIsland.set(island, (areaByIsland.get(island) ?? 0) + area);
  }

  const largestArea = Math.max(...areaByIsland.values());
  const isTrim = (island: string) =>
    (areaByIsland.get(island) ?? 0) < largestArea * TRIM_ISLAND_AREA_FRACTION;

  const tileable: number[] = [];
  const trim: number[] = [];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    (isTrim(islandOf[triangle]) ? trim : tileable).push(triangle);
  }

  if (trim.length > 0) {
    const reordered: number[] = [];
    [...tileable, ...trim].forEach((triangle) => {
      reordered.push(
        triangleVertex(triangle, 0),
        triangleVertex(triangle, 1),
        triangleVertex(triangle, 2),
      );
    });
    geometry.setIndex(reordered);
    geometry.clearGroups();
    geometry.addGroup(0, tileable.length * 3, 0);
    geometry.addGroup(tileable.length * 3, trim.length * 3, 1);
  }

  geometry.userData.tileableTriangleCount = tileable.length;
  return tileable.length;
};

/**
 * Not every sourced model even has a separate floor mesh to point at:
 * `white_modern_living_room.glb`'s whole shell — floor, walls, and ceiling —
 * is one welded surface (`Structure_Structure_0`), because floor and wall
 * triangles share edges at the skirting line and so land in the same
 * connected component no matter what. Splitting that apart needs a different
 * signal than `prepareTileableGroups`' connectivity: face orientation. A
 * near-vertical normal is a wall; a near-horizontal one is either the floor
 * or the ceiling, told apart by which half of the mesh's own height range it
 * sits in. Three groups come out — floor, wall, and "the rest" (the ceiling,
 * left with its own baked-in material) — reordered into the index buffer the
 * same way `prepareTileableGroups` does, just three-way instead of two.
 *
 * After the split, tiled floor/wall UVs are rewritten to world metres (see
 * `setTriangleRangeUvs`) so tile `repeat = 1 / tileMetres` matches
 * the labelled size — Sketchfab shells ship with 0..1 UVs, which otherwise
 * stretch a 50 cm tile across half a wall.
 */
const ORIENTATION_SPLIT_DOT = 0.7;

/**
 * Project a world-space point onto metre UVs for a face with the given
 * normal. Floors use XZ; walls use the two axes most perpendicular to the
 * face so a 50 cm tile lands at 50 cm on every orientation.
 */
const projectMetreUv = (
  point: THREE.Vector3,
  normal: THREE.Vector3,
  out: THREE.Vector2,
): THREE.Vector2 => {
  const ax = Math.abs(normal.x);
  const ay = Math.abs(normal.y);
  const az = Math.abs(normal.z);
  if (ay >= ax && ay >= az) {
    return out.set(point.x, point.z);
  }
  if (ax >= az) {
    return out.set(point.z, point.y);
  }
  return out.set(point.x, point.y);
};

/**
 * Sourced models ship with artist 0..1 UVs. `useTileTexture` sizes tiles with
 * `repeat = 1 / tileMetres`, which only reads as physical size when UVs are
 * in metres — so a tiled range of triangles gets UVs projected from world
 * position.
 *
 * A range that ends up on the model's own baked material instead (no tile
 * for that surface, or its image failed to load) needs its original UVs
 * back: on metre UVs it samples a garbled patchwork of whatever else is
 * packed into that atlas. `metres` picks which one the range gets; each
 * range remembers its current state, so repeated calls are free.
 *
 * Indexed geometry is expanded first: a vertex shared by faces that need
 * different projections (floor vs wall, or two wall orientations) cannot
 * carry both UV pairs at once.
 */
const setTriangleRangeUvs = (object: THREE.Mesh, start: number, end: number, metres: boolean) => {
  if (end <= start) return;
  let geometry = object.geometry as THREE.BufferGeometry;
  const key = `${start}:${end}`;
  const current = (geometry.userData.metreUvRanges as Record<string, boolean> | undefined)?.[key] ?? false;
  if (current === metres) return;

  if (geometry.index) {
    const groups = geometry.groups.map((group) => ({ ...group }));
    const userData = { ...geometry.userData };
    const expanded = geometry.toNonIndexed();
    expanded.clearGroups();
    groups.forEach((group) => expanded.addGroup(group.start, group.count, group.materialIndex));
    Object.assign(expanded.userData, userData);
    object.geometry = expanded;
    geometry = expanded;
  }

  const position = geometry.attributes.position;
  let uv = geometry.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uv || uv.count !== position.count) {
    uv = new THREE.BufferAttribute(new Float32Array(position.count * 2), 2);
    geometry.setAttribute("uv", uv);
  }
  // Taken before the first rewrite, so any range can be put back later.
  if (!geometry.userData.originalUvs) {
    geometry.userData.originalUvs = (uv.array as Float32Array).slice();
  }
  const original = geometry.userData.originalUvs as Float32Array;

  if (metres) {
    object.updateWorldMatrix(true, false);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const world = new THREE.Vector3();
    const projected = new THREE.Vector2();

    for (let triangle = start; triangle < end; triangle += 1) {
      const base = triangle * 3;
      a.fromBufferAttribute(position, base).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(position, base + 1).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(position, base + 2).applyMatrix4(object.matrixWorld);
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();

      for (let corner = 0; corner < 3; corner += 1) {
        world.fromBufferAttribute(position, base + corner).applyMatrix4(object.matrixWorld);
        projectMetreUv(world, normal, projected);
        uv.setXY(base + corner, projected.x, projected.y);
      }
    }
  } else {
    (uv.array as Float32Array).set(original.subarray(start * 3 * 2, end * 3 * 2), start * 3 * 2);
  }

  uv.needsUpdate = true;
  geometry.userData.metreUvRanges = {
    ...(geometry.userData.metreUvRanges as Record<string, boolean> | undefined),
    [key]: metres,
  };
};

/**
 * Wall meshes on sourced models sometimes weld the ceiling into the same
 * mesh — `Bathroom_SideWalls_0` is ~61 wall tris + ~18 ceiling tris (plus a
 * couple of near-horizontal sills). Handing the whole mesh the wall tile
 * paints the roof. Split so only near-vertical faces take the tile; the
 * rest keep the model's own material.
 *
 * Returns the number of leading (tileable) triangles.
 */
const prepareWallGroups = (object: THREE.Mesh): number => {
  const geometry = object.geometry as THREE.BufferGeometry;
  const cached = geometry.userData.wallTileableTriangleCount as number | undefined;
  if (cached !== undefined) return cached;

  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const triangleVertex = (triangle: number, corner: number) =>
    index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner;

  object.updateWorldMatrix(true, false);
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const wall: number[] = [];
  const rest: number[] = [];

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    a.fromBufferAttribute(position, triangleVertex(triangle, 0)).applyMatrix4(object.matrixWorld);
    b.fromBufferAttribute(position, triangleVertex(triangle, 1)).applyMatrix4(object.matrixWorld);
    c.fromBufferAttribute(position, triangleVertex(triangle, 2)).applyMatrix4(object.matrixWorld);
    normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
    (Math.abs(normal.dot(up)) > ORIENTATION_SPLIT_DOT ? rest : wall).push(triangle);
  }

  if (rest.length > 0) {
    const reordered: number[] = [];
    [...wall, ...rest].forEach((triangle) => {
      reordered.push(
        triangleVertex(triangle, 0),
        triangleVertex(triangle, 1),
        triangleVertex(triangle, 2),
      );
    });
    geometry.setIndex(reordered);
    geometry.clearGroups();
    geometry.addGroup(0, wall.length * 3, 0);
    geometry.addGroup(wall.length * 3, rest.length * 3, 1);
  }

  geometry.userData.wallTileableTriangleCount = wall.length;
  return wall.length;
};

/**
 * `splitByOrientation`'s wall/floor buckets catch anything near-vertical or
 * near-horizontal, which doesn't tell a real surface apart from furniture
 * that happens to face the same way — a TV, a wardrobe door, a framed
 * picture, a bed platform, a media-console top. On `modern_bedroom.glb`
 * those are welded into the same mesh as the shell and share its texture
 * atlas, so once misclassified they don't just risk taking the customer's
 * tile — `setTriangleRangeUvs` rewrites every tileable triangle's
 * UVs to a world-metres projection, which samples the wrong part of that
 * atlas even with no tile selected. That's what a flat, wrong-coloured TV
 * or cupboard face is: not a missing texture, a mis-sampled one.
 *
 * They're not welded to the actual walls/floor (different connected
 * component), and nowhere near a shell surface's own area, so the same
 * island/area-ratio test `prepareTileableGroups` uses for trim tells them
 * apart here too: keep an island only if it's within
 * `SHELL_ISLAND_AREA_FRACTION` of the *largest* one (every real wall or
 * floor plate in a room is roughly the same order of magnitude); anything
 * smaller is furniture and goes back to the untouched "rest" bucket, UVs
 * and all.
 */
const SHELL_ISLAND_AREA_FRACTION = 0.2;

const filterArchitecturalIslands = (
  candidates: number[],
  triangleVertex: (triangle: number, corner: number) => number,
  position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): { keep: number[]; furniture: number[] } => {
  if (candidates.length === 0) return { keep: [], furniture: [] };

  const parent = new Map<string, string>();
  const keyOf = (vertex: number) =>
    `${position.getX(vertex).toFixed(3)},${position.getY(vertex).toFixed(3)},${position.getZ(vertex).toFixed(3)}`;
  const find = (key: string): string => {
    const seen = parent.get(key);
    if (seen === undefined || seen === key) return key;
    const root = find(seen);
    parent.set(key, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };

  const triangleKeys: string[] = [];
  candidates.forEach((triangle) => {
    const keys = [0, 1, 2].map((corner) => keyOf(triangleVertex(triangle, corner)));
    keys.forEach((key) => {
      if (!parent.has(key)) parent.set(key, key);
    });
    union(keys[0], keys[1]);
    union(keys[1], keys[2]);
    triangleKeys.push(keys[0]);
  });

  const areaByIsland = new Map<string, number>();
  const islandOf: string[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  candidates.forEach((triangle, i) => {
    a.fromBufferAttribute(position, triangleVertex(triangle, 0));
    b.fromBufferAttribute(position, triangleVertex(triangle, 1));
    c.fromBufferAttribute(position, triangleVertex(triangle, 2));
    const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
    const island = find(triangleKeys[i]);
    islandOf.push(island);
    areaByIsland.set(island, (areaByIsland.get(island) ?? 0) + area);
  });

  const largestArea = Math.max(...areaByIsland.values());
  const keep: number[] = [];
  const furniture: number[] = [];
  candidates.forEach((triangle, i) => {
    const area = areaByIsland.get(islandOf[i]) ?? 0;
    (area >= largestArea * SHELL_ISLAND_AREA_FRACTION ? keep : furniture).push(triangle);
  });

  return { keep, furniture };
};

const splitByOrientation = (object: THREE.Mesh): { floorCount: number; wallCount: number } => {
  const geometry = object.geometry as THREE.BufferGeometry;
  const cachedFloor = geometry.userData.orientationFloorCount as number | undefined;
  const cachedWall = geometry.userData.orientationWallCount as number | undefined;
  if (cachedFloor !== undefined && cachedWall !== undefined) {
    return {
      floorCount: cachedFloor,
      wallCount: cachedWall,
    };
  }

  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const triangleVertex = (triangle: number, corner: number) =>
    index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner;

  object.updateWorldMatrix(true, false);
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const worldBox = new THREE.Box3();
  const upDot: number[] = [];
  const avgY: number[] = [];

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    a.fromBufferAttribute(position, triangleVertex(triangle, 0)).applyMatrix4(object.matrixWorld);
    b.fromBufferAttribute(position, triangleVertex(triangle, 1)).applyMatrix4(object.matrixWorld);
    c.fromBufferAttribute(position, triangleVertex(triangle, 2)).applyMatrix4(object.matrixWorld);
    worldBox.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
    upDot.push(normal.dot(up));
    avgY.push((a.y + b.y + c.y) / 3);
  }

  const midY = (worldBox.min.y + worldBox.max.y) / 2;
  const floorCandidates: number[] = [];
  const wallCandidates: number[] = [];
  const rest: number[] = [];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (Math.abs(upDot[triangle]) > ORIENTATION_SPLIT_DOT) {
      (avgY[triangle] < midY ? floorCandidates : rest).push(triangle);
    } else {
      wallCandidates.push(triangle);
    }
  }

  const { keep: floor, furniture: floorFurniture } = filterArchitecturalIslands(
    floorCandidates,
    triangleVertex,
    position,
  );
  const { keep: wall, furniture: wallFurniture } = filterArchitecturalIslands(
    wallCandidates,
    triangleVertex,
    position,
  );
  rest.push(...floorFurniture, ...wallFurniture);

  const reordered: number[] = [];
  [...floor, ...wall, ...rest].forEach((triangle) => {
    reordered.push(
      triangleVertex(triangle, 0),
      triangleVertex(triangle, 1),
      triangleVertex(triangle, 2),
    );
  });
  geometry.setIndex(reordered);
  geometry.clearGroups();
  geometry.addGroup(0, floor.length * 3, 0);
  geometry.addGroup(floor.length * 3, wall.length * 3, 1);
  geometry.addGroup((floor.length + wall.length) * 3, rest.length * 3, 2);

  geometry.userData.orientationFloorCount = floor.length;
  geometry.userData.orientationWallCount = wall.length;
  const resultGeometry = object.geometry as THREE.BufferGeometry;
  return {
    floorCount: resultGeometry.userData.orientationFloorCount as number,
    wallCount: resultGeometry.userData.orientationWallCount as number,
  };
};

/**
 * A model's tileable meshes, explicit rather than guessed from names. A
 * sourced model (e.g. a downloaded Sketchfab asset) comes with whatever
 * names its own author used, so each room component passes its own list;
 * models from `scripts/generate-room-models.mjs` follow the `Floor` /
 * `Wall_*` convention above instead and need none.
 */
export type SurfaceOverride = {
  /** Meshes tiled wholesale as floor. */
  floor?: string[];
  /** Meshes tiled wholesale as wall. */
  wall?: string[];
  /**
   * When set, wall meshes peel near-horizontal faces into the original
   * material (see `prepareWallGroups`). Needed when a sourced wall mesh
   * welds the ceiling in — e.g. bathroom side walls. Left off for shells
   * that only need `prepareTileableGroups` trim separation (kitchen), since
   * those can also have horizontal jamb faces that must stay on the trim path.
   */
  peelCeilingFromWalls?: boolean;
  /** Meshes needing `splitByOrientation` because they weld floor/wall/ceiling into one surface. */
  combinedShell?: string[];
};

const roleForSurface = (name: string, override: SurfaceOverride | undefined): "floor" | "wall" | null => {
  if (override) {
    if (override.floor?.includes(name)) return "floor";
    if (override.wall?.includes(name)) return "wall";
    return null;
  }
  if (isFloor(name)) return "floor";
  if (isWall(name)) return "wall";
  return null;
};

export type CameraConfig = {
  position: [number, number, number];
  target: [number, number, number];
  near: number;
  far: number;
  orbitLimits: {
    minDistance: number;
    maxDistance: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    minPolarAngle: number;
    maxPolarAngle: number;
  };
  /**
   * The box the camera is physically confined to, in world units. The orbit
   * limits above are the *feel* of the control; this is the guarantee. They
   * are not the same thing: distance, polar and azimuth interact, so a
   * combination that is legal on each axis on its own can still put the
   * camera through a wall or above the ceiling — which is how a zoomed-out
   * or tilted-up view ended up showing the outside of the model. Clamping
   * the position itself is the only limit that can't be walked around.
   *
   * Omitted for rooms that don't need it (the procedural shells are open on
   * the camera's side by design).
   */
  bounds?: { min: [number, number, number]; max: [number, number, number] };
  /** Horizontal field of view in degrees; see `ResponsiveCamera`. */
  horizontalFov?: number;
  /**
   * When true, mouse-wheel/pinch zoom follows the pointer ray instead of only
   * dollying toward the fixed orbit target. Useful in compact rooms where a
   * central target would otherwise send close-up zooms into furniture before
   * the user can inspect a wall tile.
   */
  zoomToCursor?: boolean;
  /**
   * Optional box for the OrbitControls target/focus point. `bounds` keeps the
   * camera body inside the room; this keeps cursor zoom from dragging the
   * point the camera looks at out toward an exterior edge.
   */
  targetBounds?: { min: [number, number, number]; max: [number, number, number] };
};

// Module constant, not an inline literal: R3F re-applies these when the prop
// identity changes, so a fresh object every render would snap the camera back
// to its starting position every time the customer picked a tile.
const GL = { antialias: true };

/**
 * Default camera rig, tuned for the ~4 m procedurally generated rooms (see
 * `scripts/generate-room-models.mjs`). A sourced model can be built at an
 * entirely different scale and origin, so there's no sensible way to derive
 * its rig from this one: those pass their own `cameraConfig` (see
 * `components/visualizer/*`).
 */
const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  // Chosen to sit comfortably inside `orbitLimits` below (~4 m out, ~80°
  // polar, ~8° azimuth) with margin on every side, so OrbitControls never has
  // to snap the view on first mount to satisfy its own bounds.
  position: [0.55, 1.84, 3.6],
  target: [0, 1.15, -0.3],
  near: 0.1,
  far: 60,
  /**
   * How far the customer can orbit before the illusion breaks. The room
   * shell is a 3-walled box open on the camera's side (see the generator) —
   * nothing stops the camera physically leaving it, so the boundary has to
   * be enforced here instead. Left unconstrained, three things go wrong:
   * swinging far enough around lets you see past the side walls' outer
   * faces (single-sided materials, so they simply vanish from behind),
   * tipping too far overhead turns "standing in a kitchen" into "looking
   * down into an open box," and zooming out while tipped over combines with
   * the wall/floor's flat repeating photo texture to read as looking
   * *through* the surfaces rather than at them, from a raking, near-top-down
   * angle. These keep the camera inside a narrow, near-eye-level cone that
   * always reads as "in the doorway looking in," never "hovering above the
   * box, staring down through it."
   */
  orbitLimits: {
    // Close enough to read the tile's texture/grout lines up close — this
    // number alone can't clip the shell either way, since the near clip
    // plane (0.1) sits well below it.
    minDistance: 0.5,
    maxDistance: 5.0,
    // Azimuth, either side of dead-centre: enough to glance toward each side
    // wall without ever swinging past one to its unrendered back face.
    minAzimuthAngle: -Math.PI / 4.5, // -40°
    maxAzimuthAngle: Math.PI / 4.5, // 40°
    // Polar angle, measured from straight up, kept to a narrow band around
    // human eye-level: steep enough that neither the floor's nor a wall's
    // flat tile photo is ever seen edge-on/raking (the "looking through it"
    // effect), shallow enough it can't graze down through the range or the
    // floor.
    minPolarAngle: Math.PI / 2.4, // 75° off vertical.
    maxPolarAngle: Math.PI / 2.05, // ~87.8° off vertical.
  },
};

/**
 * Keeps the camera inside the room, whatever the orbit limits allow. Runs at
 * the default frame priority, which is after drei's `OrbitControls` has
 * written this frame's position (it updates at priority -1), so the clamp is
 * the last word. `OrbitControls` re-derives its spherical state from
 * `camera.position` on its next update, so a clamped camera simply behaves
 * as though it had been dollied to the wall and stopped there.
 */
const ContainCamera = ({
  bounds,
  targetBounds,
}: {
  bounds: NonNullable<CameraConfig["bounds"]>;
  targetBounds?: CameraConfig["targetBounds"];
}) => {
  const min = useMemo(() => new THREE.Vector3(...bounds.min), [bounds]);
  const max = useMemo(() => new THREE.Vector3(...bounds.max), [bounds]);
  const targetMin = useMemo(
    () => (targetBounds ? new THREE.Vector3(...targetBounds.min) : null),
    [targetBounds],
  );
  const targetMax = useMemo(
    () => (targetBounds ? new THREE.Vector3(...targetBounds.max) : null),
    [targetBounds],
  );

  useFrame((state) => {
    state.camera.position.clamp(min, max);
    const controls = state.controls;
    if (
      targetMin &&
      targetMax &&
      controls &&
      "target" in controls &&
      controls.target instanceof THREE.Vector3
    ) {
      controls.target.clamp(targetMin, targetMax);
    }
  });

  return null;
};

/**
 * `PerspectiveCamera.fov` is vertical — on a wide viewport, a fixed fov shows
 * *more sideways* than it does on a narrow/square one, for the same camera
 * position and the same `ORBIT_LIMITS` below: the customer's actual browser
 * window turned out much wider than this file was tuned against, and at that
 * aspect the same "in the doorway" position let both side walls, the window
 * rods, and a strip of ceiling all into frame at once — the boundaries were
 * never loosened, the frame just got wide enough to see past what they were
 * meant to hide. Recomputing the vertical fov from the canvas's own aspect
 * ratio keeps the *horizontal* field of view roughly constant instead, so a
 * wider window shows a shorter slice of the same room rather than a wider
 * one. Clamped so a very narrow/tall viewport doesn't swing the other way
 * into a fisheye.
 *
 * How wide that constant is, is per-model (`CameraConfig.horizontalFov`),
 * because it is the only lever left once the camera is confined indoors: it
 * cannot back through a wall, so past the point where it reaches one, the
 * only way to fit more of the room in frame is a wider lens — the same
 * reason interiors are shot on wide angles rather than from further back.
 */
const DEFAULT_HORIZONTAL_FOV_DEG = 50;
const MIN_VERTICAL_FOV_DEG = 35;
const MAX_VERTICAL_FOV_DEG = 72;

const ResponsiveCamera = ({ config }: { config: CameraConfig }) => {
  const { width, height } = useThree((state) => state.size);
  const aspect = width / height || 1;
  const horizontalFovRad = THREE.MathUtils.degToRad(
    config.horizontalFov ?? DEFAULT_HORIZONTAL_FOV_DEG,
  );
  const verticalFovRad = 2 * Math.atan(Math.tan(horizontalFovRad / 2) / aspect);
  const fov = THREE.MathUtils.clamp(
    THREE.MathUtils.radToDeg(verticalFovRad),
    MIN_VERTICAL_FOV_DEG,
    MAX_VERTICAL_FOV_DEG,
  );

  return (
    <PerspectiveCamera
      makeDefault
      position={config.position}
      near={config.near}
      far={config.far}
      fov={fov}
    />
  );
};

/**
 * Byte-level download progress of room GLBs, keyed by URL, for the loading
 * overlay. drei's `useProgress` can't provide it: it counts *files* through
 * three's global loading manager, so a 30 MB model is a single step, and its
 * baseline resets whenever a batch finishes — the model download reads 0% →
 * 100%, then the ~20 textures embedded in it start a new batch at 0% again,
 * then the tile images once more. That was the flickering bar.
 *
 * Module-level on purpose: a model already in `useGLTF`'s cache mounts
 * without downloading again, and should still read as downloaded.
 */
const modelDownloads = new Map<string, number>();
const modelDownloadListeners = new Set<() => void>();

const reportModelDownload = (url: string, fraction: number) => {
  if ((modelDownloads.get(url) ?? 0) >= fraction) return;
  modelDownloads.set(url, fraction);
  modelDownloadListeners.forEach((listener) => listener());
};

const subscribeModelDownloads = (listener: () => void) => {
  modelDownloadListeners.add(listener);
  return () => {
    modelDownloadListeners.delete(listener);
  };
};

const useModelDownload = (url: string) =>
  useSyncExternalStore(
    subscribeModelDownloads,
    () => modelDownloads.get(url) ?? 0,
    () => 0,
  );

/**
 * Static files are served gzipped without a `Content-Length` (both `next dev`
 * and `next start` compress by default), so the total is usually unknown.
 * three still reports the decompressed bytes received, so those map onto a
 * curve that eases toward — but never reaches — the end of the download,
 * which only completes on load. The scale suits the room models (16–30 MB):
 * ~75% of the way at 16 MB, ~92% at 30 MB.
 */
const UNKNOWN_SIZE_SCALE_BYTES = 12_000_000;
const UNKNOWN_SIZE_CAP = 0.95;

const downloadFraction = (loaded: number, total: number) =>
  total > 0
    ? Math.min(loaded / total, UNKNOWN_SIZE_CAP)
    : Math.min(UNKNOWN_SIZE_CAP, 1 - Math.exp(-loaded / UNKNOWN_SIZE_SCALE_BYTES));

const DOWNLOAD_TRACKED = Symbol("roomDownloadTracked");

/**
 * `useGLTF`'s loader hook. R3F shares one `GLTFLoader` instance across every
 * `useGLTF` call and runs this on each, so `load` is wrapped only once. This
 * doesn't touch caching, which is keyed on the loader class and URL.
 */
const trackGltfDownload: NonNullable<Parameters<typeof useGLTF>[3]> = (loader) => {
  const tagged = loader as typeof loader & { [DOWNLOAD_TRACKED]?: true };
  if (tagged[DOWNLOAD_TRACKED]) return;
  tagged[DOWNLOAD_TRACKED] = true;
  const load = loader.load.bind(loader);
  loader.load = (url, onLoad, onProgress, onError) =>
    load(
      url,
      (gltf) => {
        reportModelDownload(url, 1);
        onLoad(gltf);
      },
      (event) => {
        reportModelDownload(url, downloadFraction(event.loaded, event.total));
        onProgress?.(event);
      },
      onError,
    );
};

const RoomModel = ({
  modelUrl,
  floorTile,
  wallTile,
  surfaceOverride,
  prepareScene,
  onReady,
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  /** Explicit tileable-mesh list; falls back to the `Floor` / `Wall_*` naming convention. */
  surfaceOverride?: SurfaceOverride;
  /** See `RoomScene`'s prop of the same name. */
  prepareScene?: (room: THREE.Object3D) => void;
  /** Fires once the shell is prepared and any selected tile textures have settled. */
  onReady?: () => void;
}) => {
  const { scene } = useGLTF(modelUrl, undefined, undefined, trackGltfDownload);
  // Clone geometry too: `scene.clone(true)` still *shares* BufferGeometry with
  // the `useGLTF` cache, and our orientation/UV rewrites would permanently
  // mutate that cache — every later visit would flash the atlas-on-metre-UVs
  // glitch before materials re-applied.
  //
  // `userData` needs its own copy as well: `BufferGeometry.clone()` shares it
  // by reference, and it's where the split/UV passes below cache their
  // results. Shared, those flags leaked into the cached geometry, so the
  // next mount (switching rooms and back) trusted counts it never computed
  // and skipped its own split — the bathroom's ceiling came back tiled with
  // the wall tile.
  const room = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const source = object.geometry as THREE.BufferGeometry;
        object.geometry = source.clone();
        object.geometry.userData = { ...source.userData };
      }
    });
    prepareScene?.(cloned);
    return cloned;
  }, [scene, prepareScene]);

  const floorTexture = useTileTexture(floorTile);
  const wallTexture = useTileTexture(wallTile);
  const floorMaterial = useTileMaterial(floorTexture.texture, floorTexture.tileSize);
  const wallMaterial = useTileMaterial(wallTexture.texture, wallTexture.tileSize);
  const tilesReady = floorTexture.ready && wallTexture.ready;

  // The GLB's own materials, kept so deselecting a tile puts the plain
  // plastered surface back rather than leaving the last tile stuck on.
  const originals = useRef(new Map<string, THREE.Material | THREE.Material[]>());
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!tilesReady) return;

    const baseline = originals.current;
    const override = surfaceOverride;

    room.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (!baseline.has(object.uuid)) baseline.set(object.uuid, object.material);
      const original = baseline.get(object.uuid)!;

      if (override?.combinedShell?.includes(object.name)) {
        const originalMaterial = Array.isArray(original) ? original[0] : original;
        const { floorCount, wallCount } = splitByOrientation(object);
        // Each surface is on metre UVs only while it actually has a tile —
        // rewriting under the model's own atlas samples the packed sprite
        // sheet across the room.
        setTriangleRangeUvs(object, 0, floorCount, Boolean(floorMaterial));
        setTriangleRangeUvs(object, floorCount, floorCount + wallCount, Boolean(wallMaterial));
        object.material = [
          floorCount > 0 ? (floorMaterial ?? originalMaterial) : originalMaterial,
          wallCount > 0 ? (wallMaterial ?? originalMaterial) : originalMaterial,
          originalMaterial,
        ];
        return;
      }

      const role = roleForSurface(object.name, override);
      if (!role) return;

      const originalMaterial = Array.isArray(original) ? original[0] : original;
      const tileMaterial = role === "floor" ? floorMaterial : wallMaterial;
      const replacement = tileMaterial ?? originalMaterial;
      // Metre UVs only under an actual tile; the model's own material needs
      // its own UVs (see `setTriangleRangeUvs`).
      const syncUvs = (triangleCount: number) =>
        setTriangleRangeUvs(object, 0, triangleCount, Boolean(tileMaterial));

      // Sourced wall meshes can weld the ceiling into the same geometry
      // (bathroom side walls). Peel horizontal faces into a second group so
      // they keep the plaster rather than taking the wall tile.
      if (role === "wall" && override?.peelCeilingFromWalls) {
        const wallTris = prepareWallGroups(object);
        const wallGeometry = object.geometry as THREE.BufferGeometry;
        if (wallGeometry.groups.length >= 2) {
          syncUvs(wallTris);
          object.material = [replacement, originalMaterial];
          return;
        }
      }

      // Trim welded into the same mesh (see `prepareTileableGroups`) keeps the
      // model's own material while the surface around it takes the tile.
      const geometry = object.geometry as THREE.BufferGeometry;
      const tileableTris = Array.isArray(original)
        ? (geometry.index?.count ?? geometry.attributes.position.count) / 3
        : prepareTileableGroups(geometry);
      const tileable = tileableTris * 3;
      // Sourced override meshes use 0..1 UVs — rewrite to metres so labelled
      // tile sizes land at their true physical scale (procedural rooms already
      // ship metre UVs from the generator, so leave those alone).
      if (override) syncUvs(tileableTris);
      const grouped = object.geometry as THREE.BufferGeometry;
      const hasTrim = grouped.groups.length === 2 && tileable > 0;

      object.material = hasTrim ? [replacement, originalMaterial] : replacement;
    });

    onReadyRef.current?.();
  }, [room, modelUrl, floorMaterial, wallMaterial, surfaceOverride, tilesReady]);

  // Keep the previous prepared shell visible while a replacement tile texture
  // is loading; the effect above swaps materials before the next rendered frame.
  return <primitive object={room} />;
};

/** Warm key light sitting inside the ceiling fixture, plus cool fill through the windows. */
const RoomLighting = () => (
  <>
    <ambientLight intensity={0.5} />
    <hemisphereLight args={[0xf2f6ff, 0x9a8f80, 0.55]} />
    <pointLight position={[0, 2.45, 0]} intensity={7} distance={9} decay={2} color={0xfff1d0} />
    {/* Daylight angled in through the back and left windows. */}
    <directionalLight position={[-3.5, 3.2, -2.4]} intensity={1.1} color={0xdfe9ff} />
    {/* Fill from the open (camera) side, so fixtures aren't lit only from behind. */}
    <directionalLight position={[2.5, 2.6, 4.5]} intensity={0.65} color={0xffffff} />

    <StudioEnvironment />
  </>
);

/**
 * Lights alone leave metal black: a metallic surface takes nearly all of its
 * colour from reflections, and there is nothing here to reflect. This bakes
 * three's own `RoomEnvironment` into an environment map so the range and its
 * pan have something to catch.
 *
 * Deliberately not drei's `<Environment>`: with in-scene children that
 * component suspends, and since it sits outside this file's only Suspense
 * boundary it took the whole canvas down with it. This is also self-contained
 * — no HDRI fetched from a CDN — so the viewer still works offline.
 */
const StudioEnvironment = () => {
  const gl = useThree((state) => state.gl);

  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    return target.texture;
  }, [gl]);

  useEffect(() => () => envMap.dispose(), [envMap]);

  // Attached declaratively rather than assigned onto `scene` — same reason
  // the background colour above is a `<color attach>`.
  return <primitive attach="environment" object={envMap} />;
};

/**
 * Catches a room whose GLB hasn't been authored yet. Deliberately not a
 * pre-flight `fetch(url, { method: "HEAD" })`: the dev server answers HEAD on
 * static files with a 503, so probing that way reports every room as missing.
 * Letting the loader try and reporting what actually happened is both simpler
 * and honest about the real outcome.
 */
class ModelErrorBoundary extends Component<{ onError: () => void; children: ReactNode }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Covers the viewport while the GLB (and any selected tile images) download,
 * and until `RoomModel` finishes preparing the shell. Hides the atlas-UV
 * flash that otherwise shows for a few frames on sourced rooms.
 *
 * The bar is split by where the wait actually goes: the model download (by
 * bytes) is most of it, then its embedded textures and the tile images (by
 * file count, via `useProgress`), then preparing the shell. It only ever
 * moves forward. Remounted per model (`key`), so each room starts from 0%
 * rather than the previous room's 100%.
 */
const DOWNLOAD_SHARE = 85;
const TEXTURE_SHARE = 14;

const RoomLoadingOverlay = ({ modelUrl, visible }: { modelUrl: string; visible: boolean }) => {
  const download = useModelDownload(modelUrl);
  const loaded = useProgress((state) => state.loaded);
  const total = useProgress((state) => state.total);
  // three's loading manager counts files cumulatively for the whole page;
  // only the ones requested after this room started loading count here.
  const [baseline] = useState(() => {
    const state = useProgress.getState();
    return { loaded: state.loaded, total: state.total };
  });
  const files =
    total > baseline.total
      ? Math.min(1, Math.max(0, (loaded - baseline.loaded) / (total - baseline.total)))
      : 0;

  const target = !visible
    ? 100
    : download < 1
      ? DOWNLOAD_SHARE * download
      : DOWNLOAD_SHARE + TEXTURE_SHARE * files;
  // Files are discovered as loading goes (the textures only once the model
  // is parsed), so `files` can drop when a new batch starts. Hold the
  // highest value reached instead of stepping backwards.
  const [shown, setShown] = useState(0);
  if (target > shown) setShown(target);
  const value = Math.min(100, Math.round(Math.max(shown, target)));

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center bg-[#eceae5] px-6 transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!visible}
      aria-busy={visible}
    >
      <Progress value={value} className="w-full max-w-xs flex-col gap-2">
        <div className="flex w-full items-baseline gap-3">
          <ProgressLabel className="text-ink">Loading room…</ProgressLabel>
          <ProgressValue className="text-muted" />
        </div>
        <ProgressTrack className="w-full bg-black/10">
          <ProgressIndicator className="bg-primary" />
        </ProgressTrack>
      </Progress>
    </div>
  );
};

export const RoomScene = ({
  modelUrl,
  floorTile,
  wallTile,
  className,
  cameraConfig: cameraConfigProp,
  surfaceOverride,
  prepareScene,
  controls,
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  className?: string;
  /**
   * Each room owns its own camera rig (see `components/visualizer/*`), so
   * this file doesn't grow an entry per sourced model. Falls back to
   * `DEFAULT_CAMERA_CONFIG`, which suits the procedurally generated rooms.
   */
  cameraConfig?: CameraConfig;
  /** Same idea as `cameraConfig`, for which meshes are tileable. */
  surfaceOverride?: SurfaceOverride;
  /**
   * Runs once on this mount's private copy of the model, before any tiling —
   * for patching a sourced model's own shortcomings (a missing wall, a
   * material that doesn't hold up close). Anything added here is tiled like
   * the rest when `surfaceOverride` names it. Must be a stable reference;
   * a new function re-clones the model.
   */
  prepareScene?: (room: THREE.Object3D) => void;
  /** Optional room-owned controls, including their own boundary handling. */
  controls?: ReactNode;
}) => {
  // Which model failed to load, so switching to another room clears it.
  const [missingUrl, setMissingUrl] = useState<string | null>(null);
  // Store which model is ready, rather than a boolean. This makes the loading
  // state correct during the render where `modelUrl` changes; resetting a
  // boolean in an effect is one render too late and briefly exposes the new
  // canvas before its model has mounted.
  const [readyModelUrl, setReadyModelUrl] = useState<string | null>(null);
  const sceneReady = readyModelUrl === modelUrl;

  if (missingUrl === modelUrl) {
    return (
      <div className={className}>
        <div className="flex size-full items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold text-muted">
            This room&apos;s 3D model isn&apos;t available yet.
          </p>
        </div>
      </div>
    );
  }

  const cameraConfig = cameraConfigProp ?? DEFAULT_CAMERA_CONFIG;

  return (
    <div className={cn("relative", className)}>
      <RoomLoadingOverlay key={`loading:${modelUrl}`} modelUrl={modelUrl} visible={!sceneReady} />
      {/* Keyed by modelUrl: switching to a model at a wildly different scale
          needs a fresh camera/controls instance,
          not OrbitControls carrying over stale internal state tuned for the
          previous room's size. */}
      <Canvas
        key={modelUrl}
        shadows
        dpr={[1, 2]}
        gl={GL}
        className={cn(!sceneReady && "opacity-0")}
      >
        <color attach="background" args={[0xeceae5]} />
        <ResponsiveCamera config={cameraConfig} />
        {!controls && cameraConfig.bounds ? (
          <ContainCamera bounds={cameraConfig.bounds} targetBounds={cameraConfig.targetBounds} />
        ) : null}
        <RoomLighting />
        <Suspense fallback={null}>
          <ModelErrorBoundary key={modelUrl} onError={() => setMissingUrl(modelUrl)}>
            <RoomModel
              modelUrl={modelUrl}
              floorTile={floorTile}
              wallTile={wallTile}
              surfaceOverride={surfaceOverride}
              prepareScene={prepareScene}
              onReady={() => setReadyModelUrl(modelUrl)}
            />
          </ModelErrorBoundary>
        </Suspense>
        {controls ?? (
          <OrbitControls
            makeDefault
            target={cameraConfig.target}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            zoomToCursor={cameraConfig.zoomToCursor}
            {...cameraConfig.orbitLimits}
          />
        )}
      </Canvas>
    </div>
  );
};

export default RoomScene;
