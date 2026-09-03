"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
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

// Module constants, not inline literals: R3F re-applies these when the prop
// identity changes, so a fresh object every render would snap the camera back
// to its starting position every time the customer picked a tile.
const CAMERA = { position: [0.4, 1.75, 5.6] as [number, number, number], fov: 45, near: 0.1, far: 60 };
const GL = { antialias: true };
const ORBIT_TARGET: [number, number, number] = [0, 1.15, -0.3];

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

      const replacement = isFloor(object.name)
        ? floorMaterial
        : isWall(object.name)
          ? wallMaterial
          : null;
      if (isFloor(object.name) || isWall(object.name)) {
        object.material = replacement ?? baseline.get(object.uuid)!;
      }
    });
  }, [room, floorMaterial, wallMaterial]);

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

  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} camera={CAMERA} gl={GL}>
        <color attach="background" args={[0xeceae5]} />
        <RoomLighting />
        <Suspense fallback={null}>
          <ModelErrorBoundary key={modelUrl} onError={() => setMissingUrl(modelUrl)}>
            <RoomModel modelUrl={modelUrl} floorTile={floorTile} wallTile={wallTile} />
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls
          makeDefault
          target={ORBIT_TARGET}
          enablePan={false}
          minDistance={2.2}
          maxDistance={8}
          // Stop short of the floor plane and of straight-down, so the camera
          // can never end up under the room or looking at the ceiling's back.
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};

export default RoomScene;
