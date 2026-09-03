/**
 * Authors the visualizer's room GLBs procedurally, so the geometry lives in
 * version control as readable code rather than as an opaque binary nobody can
 * diff or re-tune. Run it with `npm run models:build`; it writes straight into
 * `public/models/rooms/`, which is where the seeded `Room.modelUrl` values
 * already point.
 *
 * Two conventions the viewer depends on (see `room-scene.tsx`):
 *   1. Meshes named `Floor` or `Wall_*` are the tileable surfaces — the app
 *      swaps their material for the selected tile. Everything else is a fixture
 *      and keeps the material baked in here.
 *   2. UVs on those surfaces are in METRES, not 0..1. A 4 m wall runs 0..4, so
 *      one texture repeat is one metre and the app can size a real tile
 *      (`repeat = 1 / tileMetres`) without caring which surface it lands on.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter assembles the binary chunk through a browser FileReader. Node
// has Blob but not FileReader, and this is the only DOM API the geometry-only
// export path touches (textures would need more), so a three-line stand-in is
// enough to run the exporter headless.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
};

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/rooms");

// --- Room shell dimensions (metres) ----------------------------------------
const ROOM = { width: 4.2, depth: 4.2, height: 2.7 };
const WALL_THICKNESS = 0.12;

// Openings are cut by building each wall out of segments around them rather
// than with CSG — cheaper, and it keeps every surface a clean quad the tile
// texture can sit on squarely.
const DOOR = { width: 0.95, height: 2.06, centerX: -1.15 };
const BACK_WINDOW = { width: 1.5, height: 1.15, sillY: 1.0, centerX: 1.0 };
// centerZ is negative (toward the back wall, away from the open/camera side)
// so the window doesn't sit right next to the doorway threshold — closer to
// camera, it would loom disproportionately large in perspective and its
// curtain would dominate the default framing instead of reading as a normal
// part of the wall.
const LEFT_WINDOW = { width: 1.3, height: 1.15, sillY: 1.0, centerZ: -0.9 };

const material = (options) => new THREE.MeshStandardMaterial(options);

const PALETTE = {
  // DoubleSide: a wall or floor is a single flat quad with no thickness, and
  // the camera can orbit close enough to a wall's near edge to graze past its
  // front face — a single-sided material simply vanishes there, showing the
  // pale canvas background through and reading as "the wall stopped being
  // tiled." Rendering both faces means there's always a surface to hit.
  surface: material({ color: 0xd9d4cc, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
  ceiling: material({ color: 0xf3f1ec, roughness: 0.95, metalness: 0 }),
  trim: material({ color: 0xf5f3ef, roughness: 0.6, metalness: 0 }),
  doorPanel: material({ color: 0xe8e4dc, roughness: 0.55, metalness: 0 }),
  // Metalness is kept deliberately moderate across the metals: a physically
  // "correct" 0.9+ reflects the environment for nearly all of its colour, and
  // in a room lit only by lights (no HDRI) that renders as near-black. These
  // values keep enough diffuse response for the fixtures to read as metal
  // under plain lighting.
  brass: material({ color: 0xc79a4a, roughness: 0.32, metalness: 0.55 }),
  steel: material({ color: 0xd3d7dc, roughness: 0.3, metalness: 0.45 }),
  darkSteel: material({ color: 0x8f959c, roughness: 0.35, metalness: 0.42 }),
  enamel: material({ color: 0x2b2e33, roughness: 0.3, metalness: 0.25 }),
  castIron: material({ color: 0x35383d, roughness: 0.72, metalness: 0.2 }),
  burnerCap: material({ color: 0x2a2c30, roughness: 0.5, metalness: 0.35 }),
  ovenGlass: material({ color: 0x1b1f26, roughness: 0.12, metalness: 0.2 }),
  // `depthWrite: false` on both: a transparent pane sitting close to the
  // mullion/frame boxes in front of it (both occupy the same window-depth
  // band) otherwise fights with them in the depth buffer as the camera
  // moves — classic transparent-vs-opaque flicker. Not writing depth means
  // the glass never contests those boxes for which one's "in front."
  glass: material({
    color: 0xbfd8e4,
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  // The one window left clear enough to actually see the exterior through —
  // barely tinted, so the tree and sky outside read plainly rather than
  // through a frosted haze.
  glassClear: material({
    color: 0xcfe6ee,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  curtain: material({ color: 0xe4ded2, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
  curtainRod: material({ color: 0x6f6a63, roughness: 0.35, metalness: 0.85 }),
  lightBody: material({ color: 0xe9e7e2, roughness: 0.5, metalness: 0.15 }),
  lightLens: material({
    color: 0xfff6e0,
    roughness: 0.35,
    metalness: 0,
    emissive: 0xffd98a,
    emissiveIntensity: 1.4,
  }),
  // Exterior backdrop, seen through the one clear window — self-lit
  // (emissive close to their own colour) since the room's own lights are
  // aimed inward and wouldn't reach several metres past the back wall.
  sky: material({ color: 0x8fc7ec, roughness: 1, metalness: 0, emissive: 0x8fc7ec, emissiveIntensity: 0.55 }),
  ground: material({ color: 0x6fa25a, roughness: 1, metalness: 0, emissive: 0x3f6b34, emissiveIntensity: 0.4 }),
  treeTrunk: material({ color: 0x6b4a34, roughness: 0.9, metalness: 0, emissive: 0x2a1c14, emissiveIntensity: 0.3 }),
  treeFoliage: material({ color: 0x4f8a4a, roughness: 0.95, metalness: 0, emissive: 0x2c5228, emissiveIntensity: 0.35 }),
};

/**
 * Rewrites a plane's UVs from 0..1 into metres, so every tileable surface
 * shares one scale no matter how big the segment is (see the file header).
 */
const meterUvs = (geometry, width, height) => {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * width, uv.getY(i) * height);
  }
  uv.needsUpdate = true;
  return geometry;
};

/** A tileable quad (floor/wall segment) carrying metre-scaled UVs. */
const surface = (name, width, height, position, rotation) => {
  const mesh = new THREE.Mesh(
    meterUvs(new THREE.PlaneGeometry(width, height), width, height),
    PALETTE.surface,
  );
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
};

const box = (name, size, position, mat, rotation) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
};

const cylinder = (name, radiusTop, radiusBottom, height, position, mat, segments = 24, rotation) => {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat,
  );
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
};

const group = (name, ...children) => {
  const g = new THREE.Group();
  g.name = name;
  children.forEach((child) => g.add(child));
  return g;
};

// --- Room shell -------------------------------------------------------------

/**
 * One wall, split into segments around its openings. `openings` are given in
 * wall-local coordinates (u across the wall, v up from the floor), and each
 * gap produces up to four surrounding pieces — under, over, and either side.
 */
const wallWithOpenings = (name, spanWidth, openings) => {
  const pieces = [];
  const sorted = [...openings].sort((a, b) => a.u - b.u);
  let cursor = -spanWidth / 2;

  sorted.forEach((opening, index) => {
    const left = opening.u - opening.width / 2;
    const right = opening.u + opening.width / 2;

    if (left > cursor + 0.001) {
      pieces.push({ u: (cursor + left) / 2, v: ROOM.height / 2, width: left - cursor, height: ROOM.height });
    }
    if (opening.sillY > 0.001) {
      pieces.push({ u: opening.u, v: opening.sillY / 2, width: opening.width, height: opening.sillY });
    }
    const headY = opening.sillY + opening.height;
    if (headY < ROOM.height - 0.001) {
      pieces.push({
        u: opening.u,
        v: (headY + ROOM.height) / 2,
        width: opening.width,
        height: ROOM.height - headY,
      });
    }
    cursor = right;
    if (index === sorted.length - 1 && cursor < spanWidth / 2 - 0.001) {
      pieces.push({
        u: (cursor + spanWidth / 2) / 2,
        v: ROOM.height / 2,
        width: spanWidth / 2 - cursor,
        height: ROOM.height,
      });
    }
  });

  if (sorted.length === 0) {
    pieces.push({ u: 0, v: ROOM.height / 2, width: spanWidth, height: ROOM.height });
  }

  return pieces.map((piece, index) => ({ ...piece, name: `${name}_${index}` }));
};

const buildShell = () => {
  const shell = group("Shell");

  const floor = surface("Floor", ROOM.width, ROOM.depth, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  shell.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    PALETTE.ceiling,
  );
  ceiling.name = "Ceiling";
  ceiling.position.set(0, ROOM.height, 0);
  ceiling.rotation.set(Math.PI / 2, 0, 0);
  shell.add(ceiling);

  // Back wall (faces +z), carrying the doorway and the big window.
  wallWithOpenings("Wall_Back", ROOM.width, [
    { u: DOOR.centerX, width: DOOR.width, height: DOOR.height, sillY: 0 },
    {
      u: BACK_WINDOW.centerX,
      width: BACK_WINDOW.width,
      height: BACK_WINDOW.height,
      sillY: BACK_WINDOW.sillY,
    },
  ]).forEach((piece) => {
    shell.add(surface(piece.name, piece.width, piece.height, [piece.u, piece.v, -ROOM.depth / 2]));
  });

  // Left wall (faces +x), carrying the second window.
  wallWithOpenings("Wall_Left", ROOM.depth, [
    {
      u: LEFT_WINDOW.centerZ,
      width: LEFT_WINDOW.width,
      height: LEFT_WINDOW.height,
      sillY: LEFT_WINDOW.sillY,
    },
  ]).forEach((piece) => {
    shell.add(
      surface(piece.name, piece.width, piece.height, [-ROOM.width / 2, piece.v, piece.u], [0, Math.PI / 2, 0]),
    );
  });

  // Right wall (faces -x), left solid so there's always a full tiled plane to judge a wall tile on.
  wallWithOpenings("Wall_Right", ROOM.depth, []).forEach((piece) => {
    shell.add(
      surface(piece.name, piece.width, piece.height, [ROOM.width / 2, piece.v, piece.u], [0, -Math.PI / 2, 0]),
    );
  });

  // Skirting, so the floor/wall junction doesn't read as a paper-thin seam.
  const skirtHeight = 0.09;
  shell.add(
    box("Skirting_Back", [ROOM.width, skirtHeight, 0.02], [0, skirtHeight / 2, -ROOM.depth / 2 + 0.01], PALETTE.trim),
    box("Skirting_Left", [0.02, skirtHeight, ROOM.depth], [-ROOM.width / 2 + 0.01, skirtHeight / 2, 0], PALETTE.trim),
    box("Skirting_Right", [0.02, skirtHeight, ROOM.depth], [ROOM.width / 2 - 0.01, skirtHeight / 2, 0], PALETTE.trim),
  );

  return shell;
};

// --- Door -------------------------------------------------------------------

const buildDoor = () => {
  const z = -ROOM.depth / 2;
  const jamb = 0.06;
  const door = group("Door");

  // Reveal — the wall's own thickness showing through the opening.
  door.add(
    box("Door_Reveal_Left", [jamb, DOOR.height, WALL_THICKNESS], [DOOR.centerX - DOOR.width / 2 - jamb / 2, DOOR.height / 2, z - WALL_THICKNESS / 2 + 0.001], PALETTE.trim),
    box("Door_Reveal_Right", [jamb, DOOR.height, WALL_THICKNESS], [DOOR.centerX + DOOR.width / 2 + jamb / 2, DOOR.height / 2, z - WALL_THICKNESS / 2 + 0.001], PALETTE.trim),
    box("Door_Reveal_Head", [DOOR.width + jamb * 2, jamb, WALL_THICKNESS], [DOOR.centerX, DOOR.height + jamb / 2, z - WALL_THICKNESS / 2 + 0.001], PALETTE.trim),
  );

  // Casing on the room side.
  door.add(
    box("Door_Casing_Left", [0.07, DOOR.height + 0.07, 0.025], [DOOR.centerX - DOOR.width / 2 - 0.035, DOOR.height / 2, z + 0.013], PALETTE.trim),
    box("Door_Casing_Right", [0.07, DOOR.height + 0.07, 0.025], [DOOR.centerX + DOOR.width / 2 + 0.035, DOOR.height / 2, z + 0.013], PALETTE.trim),
    box("Door_Casing_Head", [DOOR.width + 0.14, 0.07, 0.025], [DOOR.centerX, DOOR.height + 0.035, z + 0.013], PALETTE.trim),
  );

  // Leaf, sitting just inside the opening, with two recessed shaker panels.
  const leafZ = z - WALL_THICKNESS / 2;
  door.add(box("Door_Leaf", [DOOR.width - 0.02, DOOR.height - 0.02, 0.045], [DOOR.centerX, DOOR.height / 2, leafZ], PALETTE.doorPanel));
  const panelDepth = 0.05;
  [
    { y: DOOR.height * 0.68, h: DOOR.height * 0.42 },
    { y: DOOR.height * 0.25, h: DOOR.height * 0.32 },
  ].forEach((panel, index) => {
    door.add(
      box(
        `Door_Panel_${index}`,
        [DOOR.width - 0.24, panel.h, panelDepth],
        [DOOR.centerX, panel.y, leafZ + 0.004],
        PALETTE.trim,
      ),
    );
  });

  // Lever handle on the room side.
  const handleX = DOOR.centerX + DOOR.width / 2 - 0.1;
  door.add(
    cylinder("Door_Rose", 0.03, 0.03, 0.02, [handleX, 1.05, leafZ + 0.032], PALETTE.brass, 20, [Math.PI / 2, 0, 0]),
    box("Door_Lever", [0.11, 0.022, 0.022], [handleX - 0.045, 1.05, leafZ + 0.05], PALETTE.brass),
  );

  return door;
};

// --- Windows + curtains -----------------------------------------------------

/**
 * Pleated curtain panel: a plane folded along its width by a sine wave, which
 * reads as fabric from any angle a flat quad wouldn't.
 */
const curtainPanel = (name, width, height, folds = 7, depth = 0.05) => {
  const geometry = new THREE.PlaneGeometry(width, height, folds * 6, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const wave = Math.sin(((x + width / 2) / width) * folds * Math.PI * 2);
    position.setZ(i, wave * depth);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, PALETTE.curtain);
  mesh.name = name;
  return mesh;
};

/**
 * One window: reveal, frame, glazing, sill, plus a rod and a pair of curtain
 * panels. Built facing +z at the origin and positioned by the caller, so the
 * back and left walls can share it.
 */
const buildWindow = (name, { width, height, sillY }, glassMaterial = PALETTE.glass) => {
  const win = group(name);
  const frame = 0.05;

  win.add(
    box(`${name}_Reveal_Left`, [0.04, height, WALL_THICKNESS], [-width / 2 - 0.02, sillY + height / 2, -WALL_THICKNESS / 2], PALETTE.trim),
    box(`${name}_Reveal_Right`, [0.04, height, WALL_THICKNESS], [width / 2 + 0.02, sillY + height / 2, -WALL_THICKNESS / 2], PALETTE.trim),
    box(`${name}_Reveal_Head`, [width + 0.08, 0.04, WALL_THICKNESS], [0, sillY + height + 0.02, -WALL_THICKNESS / 2], PALETTE.trim),
    box(`${name}_Sill`, [width + 0.22, 0.04, 0.2], [0, sillY - 0.02, 0.04], PALETTE.trim),
  );

  // Frame + a single central mullion, so the glazing reads as two sashes.
  win.add(
    box(`${name}_Frame_Left`, [frame, height, 0.06], [-width / 2 + frame / 2, sillY + height / 2, -0.03], PALETTE.trim),
    box(`${name}_Frame_Right`, [frame, height, 0.06], [width / 2 - frame / 2, sillY + height / 2, -0.03], PALETTE.trim),
    box(`${name}_Frame_Top`, [width, frame, 0.06], [0, sillY + height - frame / 2, -0.03], PALETTE.trim),
    box(`${name}_Frame_Bottom`, [width, frame, 0.06], [0, sillY + frame / 2, -0.03], PALETTE.trim),
    // Shallower and shifted toward the room side of the frame's own depth
    // band, clear of the glass pane behind it (z -0.046 to -0.034 below) —
    // sharing that band was flickering against the glass as the camera moved.
    box(`${name}_Mullion`, [0.04, height - frame * 2, 0.03], [0, sillY + height / 2, -0.015], PALETTE.trim),
  );

  const glass = box(
    `${name}_Glass`,
    [width - frame * 2, height - frame * 2, 0.012],
    [0, sillY + height / 2, -0.04],
    glassMaterial,
  );
  win.add(glass);

  // Rod overhangs the opening the way a real one does. Kept close to the wall
  // (a small fraction of the wall thickness proud of it) so it — and the
  // curtain hanging from it — reads as fixed to the wall rather than as a
  // separate panel floating in front of it.
  const rodLength = width + 0.5;
  const rodY = sillY + height + 0.16;
  const curtainZ = WALL_THICKNESS / 2 + 0.03;
  win.add(
    cylinder(`${name}_Rod`, 0.014, 0.014, rodLength, [0, rodY, curtainZ], PALETTE.curtainRod, 16, [0, 0, Math.PI / 2]),
    cylinder(`${name}_Rod_Finial_L`, 0.026, 0.026, 0.03, [-rodLength / 2, rodY, curtainZ], PALETTE.curtainRod, 16, [0, 0, Math.PI / 2]),
    cylinder(`${name}_Rod_Finial_R`, 0.026, 0.026, 0.03, [rodLength / 2, rodY, curtainZ], PALETTE.curtainRod, 16, [0, 0, Math.PI / 2]),
  );

  const curtainHeight = rodY - sillY + height * 0.12;
  const curtainWidth = width * 0.42;
  [-1, 1].forEach((side, index) => {
    const panel = curtainPanel(`${name}_Curtain_${index}`, curtainWidth, curtainHeight);
    panel.position.set(side * (width / 2 + 0.06 - curtainWidth / 2), rodY - curtainHeight / 2 - 0.02, curtainZ);
    win.add(panel);
  });

  return win;
};

// --- Gas range with a covered pan -------------------------------------------

const RANGE = { width: 0.78, depth: 0.66, height: 0.9 };

/**
 * Freestanding gas range, built in local space with its front facing +z and
 * its footprint centred on the origin, so the caller can stand it against
 * whichever wall the layout wants. The covered pan is parented to it, which
 * keeps the pot glued to its burner through any placement.
 */
const buildRange = () => {
  const { width: W, depth: D, height: H } = RANGE;
  const range = group("Cooker");

  range.add(
    box("Cooker_Body", [W, H - 0.08, D], [0, (H - 0.08) / 2 + 0.08, 0], PALETTE.darkSteel),
    // Recessed plinth, so the range reads as standing on feet rather than fused to the floor.
    box("Cooker_Plinth", [W - 0.08, 0.08, D - 0.06], [0, 0.04, 0], PALETTE.enamel),
    box("Cooker_Top", [W, 0.03, D], [0, H, 0], PALETTE.enamel),
    // Backguard carrying the control panel. Pulled 3cm forward of a flush
    // fit against the body's own back face — sitting exactly on it (both at
    // z = -D/2) left two surfaces coincident, which flickered as the camera
    // moved (the "black strip" z-fighting against the body behind it).
    box("Cooker_Backguard", [W, 0.16, 0.06], [0, H + 0.08, -D / 2 + 0.06], PALETTE.darkSteel),
  );

  // Four burners on a 2×2 grid — two small at the front, two large at the back.
  const burnerOffsets = [
    [-0.19, -0.15],
    [0.19, -0.15],
    [-0.19, 0.16],
    [0.19, 0.16],
  ];
  burnerOffsets.forEach(([dx, dz], index) => {
    const r = index >= 2 ? 0.062 : 0.05;
    range.add(
      cylinder(`Cooker_BurnerBase_${index}`, r, r * 0.86, 0.018, [dx, H + 0.024, dz], PALETTE.steel, 20),
      cylinder(`Cooker_BurnerCap_${index}`, r * 0.72, r * 0.82, 0.016, [dx, H + 0.04, dz], PALETTE.burnerCap, 20),
    );
    // Cast-iron pan supports: a cross of low bars over each burner.
    [0, Math.PI / 2].forEach((angle, barIndex) => {
      range.add(
        box(`Cooker_Grate_${index}_${barIndex}`, [r * 2.5, 0.014, 0.018], [dx, H + 0.052, dz], PALETTE.castIron, [0, angle, 0]),
      );
    });
  });

  // Oven door: inset glass panel and a full-width tubular handle.
  const doorY = 0.5;
  range.add(
    box("Cooker_OvenDoor", [W - 0.04, 0.52, 0.03], [0, doorY, D / 2 + 0.005], PALETTE.darkSteel),
    box("Cooker_OvenGlass", [W - 0.18, 0.34, 0.012], [0, doorY + 0.02, D / 2 + 0.022], PALETTE.ovenGlass),
    cylinder("Cooker_OvenHandle", 0.016, 0.016, W - 0.1, [0, doorY + 0.31, D / 2 + 0.06], PALETTE.steel, 16, [0, 0, Math.PI / 2]),
    box("Cooker_HandleStem_L", [0.02, 0.02, 0.05], [-(W - 0.16) / 2, doorY + 0.31, D / 2 + 0.035], PALETTE.steel),
    box("Cooker_HandleStem_R", [0.02, 0.02, 0.05], [(W - 0.16) / 2, doorY + 0.31, D / 2 + 0.035], PALETTE.steel),
  );

  // Control knobs along the backguard.
  [-0.24, -0.08, 0.08, 0.24].forEach((dx, index) => {
    range.add(
      // z kept 1.5cm proud of the backguard's own (now further-forward) front face.
      cylinder(`Cooker_Knob_${index}`, 0.024, 0.028, 0.03, [dx, H + 0.09, -D / 2 + 0.105], PALETTE.steel, 18, [Math.PI / 2, 0, 0]),
    );
  });

  range.add(buildPan(burnerOffsets[2], H));
  return range;
};

/** Covered pan, sitting on one of the range's back burners (range-local coords). */
const buildPan = ([burnerX, burnerZ], rangeHeight) => {
  const baseY = rangeHeight + 0.06;
  const radius = 0.115;
  const bodyHeight = 0.12;
  const pan = group("Pan");

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 18, 12), PALETTE.darkSteel);
  knob.name = "Pan_LidKnob";
  knob.position.set(burnerX, baseY + bodyHeight + 0.072, burnerZ);

  pan.add(
    cylinder("Pan_Body", radius, radius * 0.93, bodyHeight, [burnerX, baseY + bodyHeight / 2, burnerZ], PALETTE.steel, 28),
    // Lid: a shallow dome sketched as a squat cone plus a rim, then its knob.
    cylinder("Pan_LidRim", radius * 1.03, radius * 1.03, 0.012, [burnerX, baseY + bodyHeight + 0.006, burnerZ], PALETTE.steel, 28),
    cylinder("Pan_Lid", radius * 0.42, radius * 1.0, 0.035, [burnerX, baseY + bodyHeight + 0.03, burnerZ], PALETTE.steel, 28),
    cylinder("Pan_LidKnob_Stem", 0.012, 0.012, 0.018, [burnerX, baseY + bodyHeight + 0.056, burnerZ], PALETTE.darkSteel, 14),
    knob,
  );

  // Two side handles.
  [-1, 1].forEach((side, index) => {
    pan.add(
      box(
        `Pan_Handle_${index}`,
        [0.075, 0.016, 0.035],
        [burnerX + side * (radius + 0.036), baseY + bodyHeight * 0.72, burnerZ],
        PALETTE.darkSteel,
      ),
    );
  });

  return pan;
};

// --- Exterior backdrop -------------------------------------------------------

/** A simple low-poly tree: a trunk plus a few overlapping foliage clumps, so it doesn't read as one bare sphere. */
const buildTree = (name, x, z, scale = 1) => {
  const tree = group(name);
  const trunkHeight = 1.6 * scale;
  tree.add(
    cylinder(`${name}_Trunk`, 0.09 * scale, 0.13 * scale, trunkHeight, [x, trunkHeight / 2, z], PALETTE.treeTrunk, 10),
  );
  const clumps = [
    [0, trunkHeight + 0.55 * scale, 0, 0.75 * scale],
    [0.35 * scale, trunkHeight + 0.25 * scale, 0.1 * scale, 0.55 * scale],
    [-0.3 * scale, trunkHeight + 0.35 * scale, -0.15 * scale, 0.5 * scale],
    [0.05 * scale, trunkHeight + 0.9 * scale, -0.2 * scale, 0.5 * scale],
  ];
  clumps.forEach(([dx, dy, dz, radius], index) => {
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), PALETTE.treeFoliage);
    foliage.name = `${name}_Foliage_${index}`;
    foliage.position.set(x + dx, dy, z + dz);
    tree.add(foliage);
  });
  return tree;
};

/**
 * What's visible through the one clear window (see `buildKitchen`) — a sky
 * backdrop, a strip of ground, and a couple of trees. Placed beyond the back
 * wall, well outside the room shell, purely so there's *something* other than
 * void behind that glass.
 */
const buildExteriorView = () => {
  const exterior = group("Exterior");
  const wallZ = -ROOM.depth / 2;
  const skyZ = wallZ - 7;
  const groundZ = wallZ - 4;

  const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), PALETTE.sky);
  sky.name = "Exterior_Sky";
  sky.position.set(BACK_WINDOW.centerX, 3.2, skyZ);
  exterior.add(sky);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), PALETTE.ground);
  ground.name = "Exterior_Ground";
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(BACK_WINDOW.centerX, 0, groundZ);
  exterior.add(ground);

  exterior.add(buildTree("Exterior_Tree_0", BACK_WINDOW.centerX - 0.6, wallZ - 2.4, 1));
  exterior.add(buildTree("Exterior_Tree_1", BACK_WINDOW.centerX + 1.6, wallZ - 3.4, 0.7));

  return exterior;
};

// --- Ceiling light ----------------------------------------------------------

const buildCeilingLight = () => {
  const y = ROOM.height;
  const light = group("CeilingLight");
  light.add(
    cylinder("Light_Canopy", 0.16, 0.16, 0.03, [0, y - 0.015, 0], PALETTE.lightBody, 28),
    cylinder("Light_Ring", 0.34, 0.34, 0.055, [0, y - 0.05, 0], PALETTE.lightBody, 40),
    // Lens sits a hair below the ring so it reads as a lit panel, not a disc.
    cylinder("Light_Lens", 0.31, 0.31, 0.02, [0, y - 0.078, 0], PALETTE.lightLens, 40),
  );
  return light;
};

// --- Assemble + export ------------------------------------------------------

const buildKitchen = () => {
  const scene = new THREE.Scene();
  scene.name = "KitchenRoom";

  scene.add(buildShell());
  scene.add(buildDoor());

  // Kept clear (see PALETTE.glassClear) so there's an actual view out of it —
  // the tree and sky behind the back wall, below.
  const backWindow = buildWindow("WindowBack", BACK_WINDOW, PALETTE.glassClear);
  backWindow.position.set(BACK_WINDOW.centerX, 0, -ROOM.depth / 2);
  scene.add(backWindow);
  scene.add(buildExteriorView());

  const leftWindow = buildWindow("WindowLeft", LEFT_WINDOW);
  leftWindow.position.set(-ROOM.width / 2, 0, LEFT_WINDOW.centerZ);
  leftWindow.rotation.y = Math.PI / 2;
  scene.add(leftWindow);

  // Range against the right wall rather than the back one: a hob directly
  // under a curtained window is both odd to look at and wrong in a real
  // kitchen, and this way the back wall stays a clean run for judging tiles.
  const range = buildRange();
  range.position.set(ROOM.width / 2 - RANGE.depth / 2 - 0.03, 0, -0.45);
  range.rotation.y = -Math.PI / 2;
  scene.add(range);

  scene.add(buildCeilingLight());

  return scene;
};

const exportGlb = (scene, filename) =>
  new Promise((resolvePromise, reject) => {
    new GLTFExporter().parse(
      scene,
      (result) => {
        mkdirSync(OUT_DIR, { recursive: true });
        const target = resolve(OUT_DIR, filename);
        writeFileSync(target, Buffer.from(result));
        const kb = (Buffer.from(result).byteLength / 1024).toFixed(1);
        console.log(`  ${filename}  ${kb} KB`);
        resolvePromise();
      },
      (error) => reject(error),
      { binary: true },
    );
  });

console.log("Building room models…");
await exportGlb(buildKitchen(), "kitchen.glb");
console.log("Done.");
