"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { UserRoundPen } from "lucide-react";
import { useTranslation } from "react-i18next";

const StaffCreatedIndicator = ({ createdByName }: { createdByName: string }) => {
  const { t } = useTranslation();

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          aria-label={t("staff.staffCreated.aria")}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <UserRoundPen className="size-4" strokeWidth={1.9} />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup className="z-50 max-w-64 rounded-lg border border-border bg-ink px-3 py-2 text-xs font-medium text-card shadow-lg">
              <Tooltip.Arrow className="text-ink before:bg-ink" />
              {createdByName
                ? t("staff.staffCreated.tooltipWithName", { name: createdByName })
                : t("staff.staffCreated.tooltip")}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export { StaffCreatedIndicator };
