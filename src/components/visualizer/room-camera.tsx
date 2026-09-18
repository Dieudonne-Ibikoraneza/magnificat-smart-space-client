"use client";

import { useEffect, useRef, useState } from "react";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3, type Object3D } from "three";
import { ArrowDownToLine, ArrowUpToLine, BrickWall, RotateCcw, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CameraConfig, SurfaceOverride } from "@/components/room-scene";
import { RoomScene } from "@/components/room-scene";
import type { Product } from "@/components/product-card";
import { cn } from "@/lib/utils";

/**
 * The camera rig shared by the sourced rooms that walk the customer around
 * inside the model (every room in the visualizer): smooth orbit controls, a camera
 * body that can't enter walls or furniture, zoom that keeps going with the
 * lens once the camera can't get closer, and one-tap preset views.
 *
 * Each room supplies a `RoomCameraRig` with its own measurements; everything
 * here is geometry-agnostic.
 */

type Vec3 = [number, number, number];

export type RoomViewKey = "room" | "floor" | "wall" | "ceiling";

export type RoomCameraRig = {
  /** The room view (`position`/`target`), lens and orbit limits. */
  config: CameraConfig;
  /** The other preset views. Each orbits its own fixed target. */
  views: Record<Exclude<RoomViewKey, "room">, { position: Vec3; target: Vec3 }>;
  /**
   * Where the camera body may be. The near plane sits 1 cm out, so anything
   * the camera gets within a few centimetres of fills the frame as a blurred
   * slab; this keeps a margin to every shell surface.
   */
  cameraRoom: Box3;
  /** Furniture standing out into `cameraRoom`, already padded (see `fixtureZones`). */
  fixtureZones: Box3[];
};

/** Measured fixture bounds → the zones the camera is pushed back out of. */
export const fixtureZones = (bounds: [Vec3, Vec3][], clearance: number) =>
  bounds.map(([min, max]) => new Box3(new Vector3(...min), new Vector3(...max)).expandByScalar(clearance));

const exitCandidate = new Vector3();

/** Pushes `position` out through the nearest face of any zone it is inside that leads somewhere valid. */
const leaveFixtureZones = (rig: RoomCameraRig, position: Vector3) => {
  for (const zone of rig.fixtureZones) {
    if (!zone.containsPoint(position)) continue;
    const exits: [number, "x" | "y" | "z", number][] = [
      [position.x - zone.min.x, "x", zone.min.x],
      [zone.max.x - position.x, "x", zone.max.x],
      [position.y - zone.min.y, "y", zone.min.y],
      [zone.max.y - position.y, "y", zone.max.y],
      [position.z - zone.min.z, "z", zone.min.z],
      [zone.max.z - position.z, "z", zone.max.z],
    ];
    exits.sort((a, b) => a[0] - b[0]);
    const exit = exits.find(([, axis, value]) => {
      exitCandidate.copy(position).setComponent("xyz".indexOf(axis), value);
      return (
        rig.cameraRoom.containsPoint(exitCandidate) &&
        rig.fixtureZones.every((other) => other === zone || !other.containsPoint(exitCandidate))
      );
    });
    if (!exit) return false;
    position.setComponent("xyz".indexOf(exit[1]), exit[2]);
  }
  return true;
};

/** Where the camera body actually ends up for a requested position; false if nowhere valid. */
export const containCameraPosition = (rig: RoomCameraRig, position: Vector3) => {
  position.clamp(rig.cameraRoom.min, rig.cameraRoom.max);
  return leaveFixtureZones(rig, position);
};

/**
 * Along a ray from `origin`, the distance at which it last leaves `box`, or
 * null if it never passes through it. Orbit targets can sit outside the
 * camera box (the floor, wall and ceiling views aim just off a surface), so
 * this is the far slab crossing, not `Ray.intersectBox`'s nearest one.
 */
const exitDistance = (origin: Vector3, direction: Vector3, box: Box3) => {
  let near = 0;
  let far = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    const start = origin[axis];
    const step = direction[axis];
    if (Math.abs(step) < 1e-9) {
      if (start < box.min[axis] || start > box.max[axis]) return null;
      continue;
    }
    const a = (box.min[axis] - start) / step;
    const b = (box.max[axis] - start) / step;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  return near <= far ? far : null;
};

/**
 * How far the lens can zoom once the camera itself can't get any closer.
 * 5× on a 70° lens frames roughly half a metre of wall from a couple of
 * metres away — two or three tiles across, enough to read texture and grout.
 */
const MAX_LENS_ZOOM = 5;
/** Below this, a dolly step isn't a visible move — the containment is holding the camera. */
const MIN_VISIBLE_DOLLY = 0.005;

const orbitDirection = new Vector3();
const probeNow = new Vector3();
const probeNext = new Vector3();

/**
 * Wheel and pinch both go through `_dollyInternal`, so this is the one place
 * zoom behaviour lives. Dollying alone runs out quickly: every view orbits a
 * fixed target, so the camera stops at `minDistance` from that point, or at
 * the wall margin, long before a tile fills the frame. Past that point
 * zooming in narrows the lens instead, and zooming out opens the lens back
 * to 1× before the camera starts backing away.
 */
const createControlsImpl = (rig: RoomCameraRig) =>
  class RoomCameraControlsImpl extends CameraControlsImpl {
    constructor(...args: ConstructorParameters<typeof CameraControlsImpl>) {
      super(...args);
      const dolly = this._dollyInternal;
      // Negative delta is "in", matching camera-controls' own convention.
      this._dollyInternal = (delta, x, y) => {
        if (delta > 0) {
          if (this._zoomEnd > 1.001) this.lensZoom(delta);
          else dolly(delta, x, y);
          return;
        }

        const { phi, theta } = this._sphericalEnd;
        orbitDirection.setFromSphericalCoords(1, phi, theta);
        // Backed out past the room, the first steps in would only shorten an
        // orbit the containment is already cutting short — no visible change.
        // Skip straight to where the orbit re-enters the room.
        const exit = exitDistance(this._targetEnd, orbitDirection, rig.cameraRoom);
        if (exit !== null && this._sphericalEnd.radius > Math.max(exit, this.minDistance)) {
          void this.dollyTo(exit, true);
        }

        const radius = this._sphericalEnd.radius;
        const nextRadius = Math.min(
          Math.max(radius * Math.pow(0.95, -delta * this.dollySpeed), this.minDistance),
          this.maxDistance,
        );
        probeNow.copy(orbitDirection).multiplyScalar(radius).add(this._targetEnd);
        probeNext.copy(orbitDirection).multiplyScalar(nextRadius).add(this._targetEnd);
        const moves =
          containCameraPosition(rig, probeNow) &&
          containCameraPosition(rig, probeNext) &&
          probeNow.distanceTo(probeNext) > MIN_VISIBLE_DOLLY;
        if (moves) dolly(delta, x, y);
        else this.lensZoom(delta);
      };
    }

    private lensZoom(delta: number) {
      void this.zoomTo(this._zoomEnd * Math.pow(0.95, delta * this.dollySpeed), true);
    }
  };

// One class per rig: drei re-creates the controls whenever `impl` changes.
const controlsImpls = new WeakMap<RoomCameraRig, ReturnType<typeof createControlsImpl>>();
const controlsImplFor = (rig: RoomCameraRig) => {
  let impl = controlsImpls.get(rig);
  if (!impl) {
    impl = createControlsImpl(rig);
    controlsImpls.set(rig, impl);
  }
  return impl;
};

const viewPose = (rig: RoomCameraRig, view: RoomViewKey) =>
  view === "room" ? { position: rig.config.position, target: rig.config.target } : rig.views[view];

const ACTION = CameraControlsImpl.ACTION;
const MOUSE_BUTTONS = { left: ACTION.ROTATE, middle: ACTION.DOLLY, right: ACTION.NONE, wheel: ACTION.DOLLY };
const TOUCHES = { one: ACTION.TOUCH_ROTATE, two: ACTION.TOUCH_DOLLY_ROTATE, three: ACTION.NONE };

const RoomCameraControls = ({
  rig,
  view,
  revision,
}: {
  rig: RoomCameraRig;
  view: RoomViewKey;
  revision: number;
}) => {
  const controls = useRef<CameraControlsImpl>(null);
  const lastValidPosition = useRef(new Vector3(...rig.config.position));
  const camera = useThree((state) => state.camera);

  // Runs after drei's CameraControls (priority -1) has placed the camera for
  // this frame. The controls rebuild the position from their own spherical
  // state every frame, so this correction never accumulates or drifts: it
  // only moves the camera body, and the view keeps aiming the way the
  // controls pointed it.
  useFrame(() => {
    const position = camera.position;
    if (containCameraPosition(rig, position)) lastValidPosition.current.copy(position);
    else position.copy(lastValidPosition.current);

    // A drag that turns the view 10° at 1× would swing it 50° at 5×; scale
    // rotation with the lens so the picture moves at the same pace.
    const instance = controls.current;
    if (instance) {
      instance.azimuthRotateSpeed = 1 / camera.zoom;
      instance.polarRotateSpeed = 1 / camera.zoom;
    }
  });

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const { position: p, target: t } = viewPose(rig, view);
    lastValidPosition.current.set(...p);
    // Reset the complete motion state too, including any queued wheel movement.
    void instance.setLookAt(p[0], p[1], p[2], t[0], t[1], t[2], false);
    void instance.zoomTo(1, false);
  }, [camera, rig, view, revision]);

  return (
    <CameraControls
      ref={controls}
      impl={controlsImplFor(rig)}
      makeDefault
      smoothTime={0.22}
      draggingSmoothTime={0.1}
      dollySpeed={0.65}
      dollyToCursor={false}
      infinityDolly={false}
      minZoom={1}
      maxZoom={MAX_LENS_ZOOM}
      {...rig.config.orbitLimits}
      mouseButtons={MOUSE_BUTTONS}
      touches={TOUCHES}
    />
  );
};

const VIEW_BUTTONS: { view: RoomViewKey; icon: LucideIcon; labelKey: `visualizer.views.${RoomViewKey}` }[] = [
  { view: "room", icon: RotateCcw, labelKey: "visualizer.views.room" },
  { view: "floor", icon: ArrowDownToLine, labelKey: "visualizer.views.floor" },
  { view: "wall", icon: BrickWall, labelKey: "visualizer.views.wall" },
  { view: "ceiling", icon: ArrowUpToLine, labelKey: "visualizer.views.ceiling" },
];

/**
 * A sourced room with the shared camera rig and its preset-view toolbar.
 * Everything but `rig` is passed straight to `RoomScene`.
 */
export const RoomWithCamera = ({
  modelUrl,
  floorTile,
  wallTile,
  className,
  rig,
  surfaceOverride,
  prepareScene,
}: {
  modelUrl: string;
  floorTile?: Product;
  wallTile?: Product;
  className?: string;
  rig: RoomCameraRig;
  surfaceOverride?: SurfaceOverride;
  /** Must be a stable reference; see `RoomScene`. */
  prepareScene?: (room: Object3D) => void;
}) => {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<{ view: RoomViewKey; revision: number }>({
    view: "room",
    revision: 0,
  });

  return (
    <div className={cn("relative", className)}>
      <RoomScene
        modelUrl={modelUrl}
        floorTile={floorTile}
        wallTile={wallTile}
        className="size-full"
        cameraConfig={rig.config}
        surfaceOverride={surfaceOverride}
        prepareScene={prepareScene}
        controls={<RoomCameraControls rig={rig} {...selection} />}
      />
      {/* Clears the visualizer page's mobile "Change tile / Save" bar, which
          is only shown below `lg`. */}
      <div
        className="absolute bottom-20 right-4 flex gap-1 rounded-lg bg-white/95 p-1 shadow-sm lg:bottom-4"
        role="toolbar"
        aria-label={t("visualizer.views.toolbar")}
      >
        {VIEW_BUTTONS.map(({ view, icon: Icon, labelKey }) => (
          <Tooltip key={view}>
            <TooltipTrigger
              aria-label={t(labelKey)}
              className="flex size-10 items-center justify-center rounded-md text-foreground hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => setSelection((current) => ({ view, revision: current.revision + 1 }))}
            >
              <Icon size={19} />
            </TooltipTrigger>
            <TooltipContent>{t(labelKey)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
