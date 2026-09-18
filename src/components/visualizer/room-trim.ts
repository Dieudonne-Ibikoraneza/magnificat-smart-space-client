import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial, type Object3D } from "three";

/**
 * The skirting line where a wall meets the floor. None of the sourced models
 * ship one (`modern_bathroom.glb` has a mesh *named* `SkirtingBoard`, but it
 * is the shelf above the toilet), so tiled floor ran straight into tiled wall
 * with nothing to read the corner against — especially once floor and wall
 * carry similar tiles.
 *
 * Drawn as a thin band standing just proud of each wall rather than a solid
 * moulding: at 6 mm it reads as a plinth from any angle the camera can reach,
 * and it can't clip through furniture standing against the wall the way a
 * deeper box would.
 */
export type SkirtingWall = {
  /** The wall's fixed axis — `x` for a side wall, `z` for a front/back wall. */
  axis: "x" | "z";
  /** Where that wall sits on its axis. */
  at: number;
  /** The run along the *other* horizontal axis. Split a wall into several runs to skip a door or a floor-level window. */
  from: number;
  to: number;
  /** Which way the room is: `1` for increasing `axis`, `-1` for decreasing. */
  inward: 1 | -1;
};

/** Typical skirting height, and how far it stands out from the wall. */
const SKIRTING_HEIGHT = 0.08;
const SKIRTING_INSET = 0.006;

/**
 * Deliberately not the customer's tile: this is the trim that separates
 * floor from wall, so it has to stay legible against whatever tile is on
 * either side. A dark satin graphite reads as a modern plinth against pale
 * tiles and as a shadow gap against dark ones.
 */
const SKIRTING_MATERIAL = new MeshStandardMaterial({
  name: "Skirting",
  color: 0x44474b,
  roughness: 0.55,
  metalness: 0.05,
});

export const addSkirting = (
  room: Object3D,
  {
    floorY,
    walls,
    height = SKIRTING_HEIGHT,
    inset = SKIRTING_INSET,
    name = "Room_Skirting",
  }: {
    floorY: number;
    walls: SkirtingWall[];
    height?: number;
    inset?: number;
    name?: string;
  },
) => {
  const positions: number[] = [];
  const normals: number[] = [];
  const top = floorY + height;

  for (const { axis, at, from, to, inward } of walls) {
    const face = at + inset * inward;
    // Corners in order bottom-from, bottom-to, top-to, top-from.
    const corner = (along: number, y: number): [number, number, number] =>
      axis === "x" ? [face, y, along] : [along, y, face];
    const corners = [corner(from, floorY), corner(to, floorY), corner(to, top), corner(from, top)];

    // Wound so the face points into the room, whichever way the run goes.
    // The cross product of the two run/height edges comes out with opposite
    // sign on the two axes, hence `axisSign`.
    const axisSign = axis === "x" ? -1 : 1;
    const frontFacing = inward * axisSign * (to > from ? 1 : -1) > 0;
    const order = frontFacing ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const normal = axis === "x" ? [inward, 0, 0] : [0, 0, inward];
    for (const corner of order) {
      positions.push(...corners[corner]);
      normals.push(...normal);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  const skirting = new Mesh(geometry, SKIRTING_MATERIAL);
  skirting.name = name;
  room.add(skirting);
  return skirting;
};
