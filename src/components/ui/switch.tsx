"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-muted-background p-0.5 transition-colors outline-none data-[checked]:border-primary data-[checked]:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="flex size-6 items-center justify-center rounded-full bg-white text-transparent shadow-sm ring-1 ring-border transition-all data-[checked]:translate-x-5 data-[checked]:bg-blue-600 data-[checked]:text-white data-[checked]:ring-blue-600"
      >
        <Check className="size-3.5 stroke-3" />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
