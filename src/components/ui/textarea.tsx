import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "min-h-16 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  ),
)

Textarea.displayName = "Textarea"

export { Textarea }
