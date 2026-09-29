import type { VisualizerTileCorner, VisualizerTilePattern } from "@/lib/api/types";

// Rows run from low to high V. At the group's center, all four cells sample
// source UV (1, 1). Sampling rotations are the inverse of artwork rotations.
export const FOUR_TURN_LAYOUT = [[0, 1], [3, 2]] as const;

/** Shared rotation for the image coordinates and their sampling gradients. */
const CORNER_TURNS: Record<VisualizerTileCorner, number> = {
  TOP_RIGHT: 0,
  BOTTOM_RIGHT: 1,
  BOTTOM_LEFT: 2,
  TOP_LEFT: 3,
};

export const tilePatternShader = (
  pattern: VisualizerTilePattern,
  corner: VisualizerTileCorner = "TOP_RIGHT",
): string => `
float tileQuarterTurn(vec2 cell) {
  ${pattern === "QUARTER_TURN" ? `
  vec2 parity = mod(cell, 2.0);
  return parity.x < 0.5
    ? (parity.y < 0.5 ? ${FOUR_TURN_LAYOUT[0][0]}.0 : ${FOUR_TURN_LAYOUT[1][0]}.0)
    : (parity.y < 0.5 ? ${FOUR_TURN_LAYOUT[0][1]}.0 : ${FOUR_TURN_LAYOUT[1][1]}.0);
  ` : pattern === "TWO_TURN" ? "return mod(cell.x + cell.y, 2.0) * 2.0;" : "return 0.0;"}
}

vec2 tileRotateVector(vec2 value, float turn) {
  if (turn < 0.5) return value;
  if (turn < 1.5) return vec2(value.y, -value.x);
  if (turn < 2.5) return -value;
  return vec2(-value.y, value.x);
}

vec4 tileSample(sampler2D imageMap, vec2 uv) {
  // Select the source corner before arranging the four tiles. Straight and
  // two-turn layouts retain the source orientation regardless of this setting.
  float turn = mod(tileQuarterTurn(floor(uv)) + ${pattern === "QUARTER_TURN" ? CORNER_TURNS[corner] : 0}.0, 4.0);
  vec2 localUv = tileRotateVector(fract(uv) - 0.5, turn) + 0.5;
  // Take derivatives before fract/rotation introduce discontinuities. This
  // preserves the actual pixel footprint at seams and at oblique camera angles.
  vec2 gradientX = tileRotateVector(dFdx(uv), turn);
  vec2 gradientY = tileRotateVector(dFdy(uv), turn);
  return textureGrad(imageMap, localUv, gradientX, gradientY);
}
`;
