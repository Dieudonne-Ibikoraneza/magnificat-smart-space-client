"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
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

  // Reset during render when the selection changes rather than from an effect
  // — the same pattern `useApi` uses for its own inputs, and it stops the
  // previous tile showing for a frame under the new selection.
  const [loaded, setLoaded] = useState<{ id: string | undefined; texture: THREE.Texture | null }>({
    id: productId,
    texture: null,
  });
  if (loaded.id !== productId) setLoaded({ id: productId, texture: null });

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
      // A tile whose image won't load simply stays untiled.
      () => undefined,
    );

    return () => {
      active = false;
    };
  }, [product]);

  // Textures are GPU allocations, so the outgoing one has to be released by hand.
  useEffect(() => () => loaded.texture?.dispose(), [loaded.texture]);

  return loaded.texture;
};

/** One shared material per surface role — every wall segment tiles identically. */
const useTileMaterial = (texture: THREE.Texture | null) => {
  const material = useMemo(
    () => (texture ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, metalness: 0.05 }) : null),
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
const MODEL_SURFACE_OVERRIDES: Record<string, { floor: string[]; wall: string[] }> = {
  "/models/rooms/modern_kitchen.glb": {
    floor: ["Floor_Wall_0"],
    // The whole house shell is one mesh (open-plan, stairwell included) —
    // tiling it re-tiles every wall in the model, not just the kitchen's.
    // `WindowWall_Wall_0` deliberately isn't listed: despite the name, it's
    // the panel the window itself is set into (right up against the glass),
    // not a paintable room wall — tiling it read as "the window's own
    // surround got tiled instead of the actual wall."
    wall: ["Structure_Wall_0"],
  },
};

const surfaceRoleOf = (modelUrl: string, name: string): "floor" | "wall" | null => {
  const override = MODEL_SURFACE_OVERRIDES[modelUrl];
  if (override) {
    if (override.floor.includes(name)) return "floor";
    if (override.wall.includes(name)) return "wall";
    return null;
  }
  if (isFloor(name)) return "floor";
  if (isWall(name)) return "wall";
  return null;
};

type CameraConfig = {
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
    position: [-4.04, 2.32, 3.21],
    target: [3, 1.5, -0.5],
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
    orbitLimits: {
      minDistance: 5,
      maxDistance: 14,
      // Asymmetric on purpose: swinging toward 0° (measured, camera at
      // pos≈(-4.2,2.6,7.45)) put the camera almost against a wall past the
      // kitchen's far corner, filling the frame with a close-up of it.
      minAzimuthAngle: (-62.24 - 20) * (Math.PI / 180),
      maxAzimuthAngle: (-62.24 + 8) * (Math.PI / 180),
      minPolarAngle: Math.PI / 2.6,
      maxPolarAngle: Math.PI / 2.05,
    },
  },
};

const cameraConfigFor = (modelUrl: string): CameraConfig =>
  MODEL_CAMERA_CONFIGS[modelUrl] ?? DEFAULT_CAMERA_CONFIG;

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
 */
const TARGET_HORIZONTAL_FOV_DEG = 50;
const MIN_VERTICAL_FOV_DEG = 35;
const MAX_VERTICAL_FOV_DEG = 60;

const ResponsiveCamera = ({ config }: { config: CameraConfig }) => {
  const { width, height } = useThree((state) => state.size);
  const aspect = width / height || 1;
  const horizontalFovRad = THREE.MathUtils.degToRad(TARGET_HORIZONTAL_FOV_DEG);
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
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
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

    room.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (!baseline.has(object.uuid)) baseline.set(object.uuid, object.material);

      const role = surfaceRoleOf(modelUrl, object.name);
      if (role) {
        const replacement = role === "floor" ? floorMaterial : wallMaterial;
        object.material = replacement ?? baseline.get(object.uuid)!;
      }
    });
  }, [room, modelUrl, floorMaterial, wallMaterial]);

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
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  className?: string;
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

  const cameraConfig = cameraConfigFor(modelUrl);

  return (
    <div className={className}>
      {/* Keyed by modelUrl: switching to a model at a wildly different scale
          (see `MODEL_CAMERA_CONFIGS`) needs a fresh camera/controls instance,
          not OrbitControls carrying over stale internal state tuned for the
          previous room's size. */}
      <Canvas key={modelUrl} shadows dpr={[1, 2]} gl={GL}>
        <color attach="background" args={[0xeceae5]} />
        <ResponsiveCamera config={cameraConfig} />
        <RoomLighting />
        <Suspense fallback={null}>
          <ModelErrorBoundary key={modelUrl} onError={() => setMissingUrl(modelUrl)}>
            <RoomModel modelUrl={modelUrl} floorTile={floorTile} wallTile={wallTile} />
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
