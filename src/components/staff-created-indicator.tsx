"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { UserRoundPen } from "lucide-react";

const StaffCreatedIndicator = ({ createdByName }: { createdByName: string }) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        aria-label="This order was created by staff"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <UserRoundPen className="size-4" strokeWidth={1.9} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="z-50 max-w-64 rounded-lg border border-border bg-ink px-3 py-2 text-xs font-medium text-card shadow-lg">
            <Tooltip.Arrow className="text-ink before:bg-ink" />
            This order was created by staff for the customer{createdByName ? ` (${createdByName})` : ""}.
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export { StaffCreatedIndicator };
