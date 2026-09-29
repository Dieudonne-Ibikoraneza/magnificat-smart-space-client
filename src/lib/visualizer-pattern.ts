import type { VisualizerTileCorner, VisualizerTilePattern } from "@/lib/api/types";

export const visualizerCornerLabelKey = (corner: VisualizerTileCorner = "TOP_RIGHT") => ({
  TOP_RIGHT: "visualizerPattern.topRight",
  BOTTOM_RIGHT: "visualizerPattern.bottomRight",
  BOTTOM_LEFT: "visualizerPattern.bottomLeft",
  TOP_LEFT: "visualizerPattern.topLeft",
})[corner];

export const visualizerPatternLabelKey = (pattern: VisualizerTilePattern | null | undefined) => {
  switch (pattern) {
    case "TWO_TURN":
      return "visualizerPattern.twoTurn";
    case "QUARTER_TURN":
      return "visualizerPattern.fourTurn";
    case "STRAIGHT":
    default:
      return "visualizerPattern.straight";
  }
};
