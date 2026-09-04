"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Product } from "@/components/product-card";

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
 */
const useTileTexture = (product: Product | undefined) => {
  const productId = product?.id;

  // Switching tiles keeps showing the *previous* one until the new image has
  // actually finished loading, rather than dropping to the untiled surface
  // for the gap — that gap is a real, visible flash (a network fetch takes
  // tens to hundreds of milliseconds), not a one-frame nicety. Deselecting
  // down to no tile is the one case cleared right away, in render rather
  // than from an effect — the same pattern `useApi` uses for its own inputs
  // — since there's no "next" texture to wait for.
  const [loaded, setLoaded] = useState<{ id: string | undefined; texture: THREE.Texture | null }>({
    id: productId,
    texture: null,
  });
  if (productId === undefined && loaded.id !== undefined) {
    setLoaded({ id: undefined, texture: null });
  }

  useEffect(() => {
    if (!product) return;

    let active = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
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
        setLoaded({ id: product.id, texture });
      },
      undefined,
      // A tile whose image won't load ends up untiled — but only once that's
      // actually known, not for the whole gap while it was still trying.
      () => {
        if (active) setLoaded({ id: product.id, texture: null });
      },
    );

    return () => {
      active = false;
    };
  }, [product]);

  // Textures are GPU allocations, so the outgoing one has to be released by hand.
  useEffect(() => () => loaded.texture?.dispose(), [loaded.texture]);

  return loaded.texture;
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
const useTileMaterial = (texture: THREE.Texture | null) => {
  const material = useMemo(
    () =>
      texture
        ? new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.45,
            metalness: 0.05,
            side: THREE.DoubleSide,
          })
        : null,
    [texture],
  );

  useEffect(() => () => material?.dispose(), [material]);

  return material;
};

const isFloor = (name: string) => name === "Floor";
const isWall = (name: string) => name.startsWith("Wall_");

/**
 * The `Floor` / `Wall_*` naming convention above is a contract this app
 * controls — it's what `scripts/generate-room-models.mjs` deliberately names
 * things. A model sourced elsewhere (e.g. a downloaded Sketchfab asset) comes
 * with whatever names its own author used, so it needs its tileable meshes
 * looked up by an explicit list instead. Keyed by `modelUrl`; a model with no
 * entry here falls through to the naming convention as normal.
 */
const MODEL_SURFACE_OVERRIDES: Record<string, SurfaceOverride> = {
  "/models/rooms/modern_kitchen.glb": {
    floor: ["Floor_Wall_0"],
    /**
     * Both walls, despite the confusingly similar `*_Wall_0` names:
     *
     * - `WindowWall_Wall_0` is the kitchen's big interior wall — the broad
     *   surface beside the window.
     * - `Structure_Wall_0` is the house shell, which is what the stairs side
     *   of the room is made of.
     *
     * The shell also carries the window's reveal welded into the same mesh;
     * `prepareTileableGroups` separates that out so the tile lands on the
     * wall and not on the few centimetres of jamb around the glass.
     */
    wall: ["WindowWall_Wall_0", "Structure_Wall_0"],
  },
};

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
 * After the split, floor/wall UVs are rewritten to world metres (see
 * `rewriteOrientationUvsToMetres`) so tile `repeat = 1 / tileMetres` matches
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
 * in metres — so rewrite the leading tileable triangles from world position.
 *
 * Indexed geometry is expanded first: a vertex shared by faces that need
 * different projections (floor vs wall, or two wall orientations) cannot
 * carry both UV pairs at once.
 */
const rewriteLeadingTriangleUvsToMetres = (object: THREE.Mesh, triangleCount: number) => {
  if (triangleCount <= 0) return;
  let geometry = object.geometry as THREE.BufferGeometry;
  if (geometry.userData.metreUvs) return;

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

  object.updateWorldMatrix(true, false);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const world = new THREE.Vector3();
  const projected = new THREE.Vector2();

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
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

  uv.needsUpdate = true;
  geometry.userData.metreUvs = true;
};

const rewriteOrientationUvsToMetres = (object: THREE.Mesh) => {
  const geometry = object.geometry as THREE.BufferGeometry;
  const floorCount = (geometry.userData.orientationFloorCount as number) ?? 0;
  const wallCount = (geometry.userData.orientationWallCount as number) ?? 0;
  rewriteLeadingTriangleUvsToMetres(object, floorCount + wallCount);
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
 * tile — `rewriteOrientationUvsToMetres` rewrites every tileable triangle's
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
    rewriteOrientationUvsToMetres(object);
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
  rewriteOrientationUvsToMetres(object);
  const resultGeometry = object.geometry as THREE.BufferGeometry;
  return {
    floorCount: resultGeometry.userData.orientationFloorCount as number,
    wallCount: resultGeometry.userData.orientationWallCount as number,
  };
};

/** A model's tileable meshes, explicit rather than guessed from names — see `MODEL_SURFACE_OVERRIDES`. */
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

const surfaceOverrideFor = (modelUrl: string): SurfaceOverride | undefined => MODEL_SURFACE_OVERRIDES[modelUrl];

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
};

// Module constant, not an inline literal: R3F re-applies these when the prop
// identity changes, so a fresh object every render would snap the camera back
// to its starting position every time the customer picked a tile.
const GL = { antialias: true };

/**
 * Default camera rig, tuned for the ~4 m procedurally generated rooms (see
 * `scripts/generate-room-models.mjs`). A model with its own entry in
 * `MODEL_CAMERA_CONFIGS` below overrides this wholesale — a downloaded asset
 * can be built at an entirely different scale and origin, so there's no
 * sensible way to derive its rig from this one.
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
    minDistance: 2.2,
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
 * `modern_kitchen.glb` (doc: sourced from Sketchfab, not generated here) is
 * a whole open-plan ground floor — kitchen, stairwell, and all — built many
 * times larger than the procedural rooms and centred nowhere near its own
 * origin. `position`/`target` below were measured by dumping this model's
 * own bounding boxes (`Box3.setFromObject` per mesh) rather than guessed:
 * the kitchen run (cupboards/counters/sink/hob) centres around world x≈3,
 * z≈0.5, and the floor sits at y≈-0.18, so a standing eye-height target is
 * y≈1.3. The camera itself sits back near where the breakfast stools are,
 * a little above eye height, angled in on that run — the same kind of
 * three-quarter framing as the source listing's own preview render.
 *
 * `position.x` is deliberately kept a couple of metres clear of the
 * exterior wall (which sits at x≈-6.48, the floor mesh's own boundary): an
 * earlier attempt put the camera at x=-6.5 — almost touching that wall — so
 * one edge of frame was a metres-away, badly minified close-up of it,
 * blown out to a flat wash by the tile texture's own mip levels (the same
 * effect the procedural rooms' curtains hit at a grazing angle), while the
 * rest of frame read fine. It looked exactly like "the wall tile is on the
 * wrong spot" — it wasn't; the camera was just standing inside the wall's
 * near field.
 */
const MODEL_CAMERA_CONFIGS: Record<string, CameraConfig> = {
  "/models/rooms/modern_kitchen.glb": {
    /**
     * ~9.2 m back along the same three-quarter line as before (was 8 m), so
     * more of the run is in frame from the outset.
     *
     * The target sits at 0.8 m rather than eye height, which drops the whole
     * rig (the position is the target plus an offset) to a camera height of
     * ~1.7 m. That is what puts floor *behind the stools* in frame: the
     * bottom of the frame is a fixed angle below the view axis, so how close
     * to the camera it meets the floor depends on how high the camera is,
     * not on how far back it is. At the old 2.4 m the nearest visible floor
     * was x≈-1.4 — level with the stools at x≈-1.6, so they sat hard on the
     * bottom edge. At 1.7 m it reaches x≈-2.5, clearing ~0.9 m behind them.
     * Raising the camera instead does the opposite: it lifts the near floor
     * further out of frame.
     */
    position: [-5.1, 1.44, 3.76],
    target: [3, 0.5, -0.5],
    near: 0.1,
    far: 100,
    /**
     * This default `position`/`target` pair sits at azimuth ≈ -62°, not 0°
     * (it's a deliberately angled three-quarter view, matching the source
     * listing's own preview render) — so unlike the procedural rooms, the
     * azimuth window here is centred on *that* angle, not on dead-ahead.
     * Centring it on 0° instead once clamped the default view itself down
     * to a near-zero-distance snap on mount, because the un-clamped default
     * fell way outside a window centred elsewhere. The window is narrow
     * (±20°) because, unlike the procedural rooms' closed boxes, this is an
     * open-plan house shell — swing much further and the camera points at
     * the blank back of unfurnished walls and the stairwell that were never
     * meant to be seen head-on.
     */
    /**
     * Wide, because the camera is boxed in indoors. Backing up runs into a
     * wall at ~10 m from this target, and at the old 50° that framed only
     * ~9 m of room — *less* than before it was confined, which is the wrong
     * direction. At 75° the same 10 m frames ~15 m, so the whole 13.4 m room
     * fits with the camera still inside it.
     */
    horizontalFov: 75,
    orbitLimits: {
      minDistance: 4,
      // Deliberately past what the room allows: `bounds` is the real stop,
      // so the dolly runs until the camera actually reaches a wall rather
      // than halting early at a number that has to guess where the walls are.
      maxDistance: 16,
      // Asymmetric on purpose: swinging toward 0° (measured, camera at
      // pos≈(-4.2,2.6,7.45)) put the camera almost against a wall past the
      // kitchen's far corner, filling the frame with a close-up of it.
      minAzimuthAngle: (-62.24 - 20) * (Math.PI / 180),
      maxAzimuthAngle: (-62.24 + 8) * (Math.PI / 180),
      // 72°, not 69°: at the far end of the dolly the shallower angle lifted
      // the camera to roughly ceiling height, which is where the view started
      // looking down onto the top of the model instead of into the room.
      minPolarAngle: (72 * Math.PI) / 180,
      maxPolarAngle: Math.PI / 2.05,
    },
    /**
     * The room's own interior, measured off the model, pulled in far enough
     * that the camera never sits in a wall: the floor runs x -6.48..6.90 and
     * z -4.46..7.45, and the walls stop at y 5.32 (`WindowWall_Wall_0` is
     * 5.5 m tall from a floor at y -0.18, and the ceiling slab's underside
     * agrees).
     *
     * `max[1]` is well under that, at 3.6 rather than something closer to
     * the walls' own 5.32 — not for the walls' sake, but for the pendant
     * lights hanging over the island: their cords run most of the way up to
     * the ceiling, and swinging to the far azimuth limit while tilted all
     * the way up put the camera up near y=4.9, close enough to one that its
     * thin cord — nearly end-on from up there — stretched across the frame.
     * 3.6 sits just above the ~3.34 the default azimuth's own tilt-up
     * reaches (already checked clean), so the well-behaved views keep their
     * full range and only the combination that reached the cords is cut off.
     */
    bounds: {
      min: [-6.25, 0.8, -4.15],
      max: [6.65, 3.6, 7.15],
    },
  },
};

const cameraConfigFor = (modelUrl: string): CameraConfig =>
  MODEL_CAMERA_CONFIGS[modelUrl] ?? DEFAULT_CAMERA_CONFIG;

/**
 * Keeps the camera inside the room, whatever the orbit limits allow. Runs at
 * the default frame priority, which is after drei's `OrbitControls` has
 * written this frame's position (it updates at priority -1), so the clamp is
 * the last word. `OrbitControls` re-derives its spherical state from
 * `camera.position` on its next update, so a clamped camera simply behaves
 * as though it had been dollied to the wall and stopped there.
 */
const ContainCamera = ({ bounds }: { bounds: NonNullable<CameraConfig["bounds"]> }) => {
  const min = useMemo(() => new THREE.Vector3(...bounds.min), [bounds]);
  const max = useMemo(() => new THREE.Vector3(...bounds.max), [bounds]);

  useFrame((state) => {
    state.camera.position.clamp(min, max);
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

const RoomModel = ({
  modelUrl,
  floorTile,
  wallTile,
  surfaceOverride,
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  /** Explicit tileable-mesh list; falls back to `MODEL_SURFACE_OVERRIDES[modelUrl]`, then the naming convention. */
  surfaceOverride?: SurfaceOverride;
}) => {
  const { scene } = useGLTF(modelUrl);
  // Clone once per load: `useGLTF` caches the source scene across mounts, and
  // re-materialling the cached copy would leak into every other consumer.
  const room = useMemo(() => scene.clone(true), [scene]);

  const floorMaterial = useTileMaterial(useTileTexture(floorTile));
  const wallMaterial = useTileMaterial(useTileTexture(wallTile));

  // The GLB's own materials, kept so deselecting a tile puts the plain
  // plastered surface back rather than leaving the last tile stuck on.
  const originals = useRef(new Map<string, THREE.Material | THREE.Material[]>());

  useEffect(() => {
    const baseline = originals.current;
    const override = surfaceOverride ?? surfaceOverrideFor(modelUrl);

    room.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (!baseline.has(object.uuid)) baseline.set(object.uuid, object.material);
      const original = baseline.get(object.uuid)!;

      if (override?.combinedShell?.includes(object.name)) {
        const originalMaterial = Array.isArray(original) ? original[0] : original;
        const { floorCount, wallCount } = splitByOrientation(object);
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
      const replacement = (role === "floor" ? floorMaterial : wallMaterial) ?? originalMaterial;

      // Sourced wall meshes can weld the ceiling into the same geometry
      // (bathroom side walls). Peel horizontal faces into a second group so
      // they keep the plaster rather than taking the wall tile.
      if (role === "wall" && override?.peelCeilingFromWalls) {
        const wallTris = prepareWallGroups(object);
        const wallGeometry = object.geometry as THREE.BufferGeometry;
        if (wallGeometry.groups.length >= 2) {
          rewriteLeadingTriangleUvsToMetres(object, wallTris);
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
      if (override) rewriteLeadingTriangleUvsToMetres(object, tileableTris);
      const grouped = object.geometry as THREE.BufferGeometry;
      const hasTrim = grouped.groups.length === 2 && tileable > 0;

      object.material = hasTrim ? [replacement, originalMaterial] : replacement;
    });
  }, [room, modelUrl, floorMaterial, wallMaterial, surfaceOverride]);

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

export const RoomScene = ({
  modelUrl,
  floorTile,
  wallTile,
  className,
  cameraConfig: cameraConfigProp,
  surfaceOverride,
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  className?: string;
  /**
   * Own the room's camera rig here instead of adding another entry to the
   * internal `MODEL_CAMERA_CONFIGS` map — the point of taking it as a prop
   * (see `components/visualizer/living-room.tsx`) is that a per-room
   * component can carry its own tuning without this file growing an entry
   * per sourced model. Falls back to `MODEL_CAMERA_CONFIGS[modelUrl]`, then
   * `DEFAULT_CAMERA_CONFIG`, for callers (Kitchen, still wired inline in the
   * visualizer page) that predate this prop.
   */
  cameraConfig?: CameraConfig;
  /** Same idea as `cameraConfig`, for which meshes are tileable. */
  surfaceOverride?: SurfaceOverride;
}) => {
  // Which model failed to load, so switching to another room clears it.
  const [missingUrl, setMissingUrl] = useState<string | null>(null);

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

  const cameraConfig = cameraConfigProp ?? cameraConfigFor(modelUrl);

  return (
    <div className={className}>
      {/* Keyed by modelUrl: switching to a model at a wildly different scale
          (see `MODEL_CAMERA_CONFIGS`) needs a fresh camera/controls instance,
          not OrbitControls carrying over stale internal state tuned for the
          previous room's size. */}
      <Canvas key={modelUrl} shadows dpr={[1, 2]} gl={GL}>
        <color attach="background" args={[0xeceae5]} />
        <ResponsiveCamera config={cameraConfig} />
        {cameraConfig.bounds ? <ContainCamera bounds={cameraConfig.bounds} /> : null}
        <RoomLighting />
        <Suspense fallback={null}>
          <ModelErrorBoundary key={modelUrl} onError={() => setMissingUrl(modelUrl)}>
            <RoomModel
              modelUrl={modelUrl}
              floorTile={floorTile}
              wallTile={wallTile}
              surfaceOverride={surfaceOverride}
            />
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls
          makeDefault
          target={cameraConfig.target}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          {...cameraConfig.orbitLimits}
        />
      </Canvas>
    </div>
  );
};

export default RoomScene;
