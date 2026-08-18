import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-3 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#F3F4F6] text-ink",
        primary: "border-transparent bg-blue-100 text-blue-700",
        secondary: "border-transparent bg-primary text-ink",
        muted: "border-transparent bg-[#F3F4F6] text-ink",
        warning: "border-transparent bg-[#FAFD29] text-[#F4B400]",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border bg-transparent text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
