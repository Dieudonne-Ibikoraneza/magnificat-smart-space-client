"use client";

import { useTranslation } from "react-i18next";
import type { VisualizerTileCorner } from "@/lib/api/types";
import { visualizerCornerLabelKey } from "@/lib/visualizer-pattern";
import { cn } from "@/lib/utils";

const CORNERS: VisualizerTileCorner[] = ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"];

/** Staff selects the corner of the original photo that meets at a group center. */
export function TilePatternCornerField({ value, onChange }: {
  value: VisualizerTileCorner;
  onChange: (value: VisualizerTileCorner) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium text-ink">{t("visualizerPattern.centerCorner")}</legend>
      <p className="mt-1 text-xs text-muted-foreground">{t("visualizerPattern.centerCornerHint")}</p>
      <div className="mt-2 grid max-w-xs grid-cols-2 gap-2">
        {CORNERS.map((corner) => (
          <button
            key={corner}
            type="button"
            aria-pressed={value === corner}
            onClick={() => onChange(corner)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              value === corner ? "border-primary bg-primary text-ink" : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {t(visualizerCornerLabelKey(corner))}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
