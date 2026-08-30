"use client";

import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-ink/50 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: DialogPrimitive.Popup.Props & { showClose?: boolean }) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  // `items-center` alone clips the top of a popup taller than the viewport —
  // a centered flex item that overflows its container scrolls from the
  // middle out, so the start (the dialog's own header and close button) is
  // the unreachable part. `align-items: safe center` is the CSS-only fix for
  // that, but isn't reliably supported in the WebKit build these devices
  // run — it silently falls back to plain `center`, clipping exactly as
  // before. This measures the popup itself instead: centered whenever it
  // fits the viewport (the common case — most dialogs are short), and
  // top-aligned the moment it doesn't, so it's always scrollable from its
  // own literal top all the way to the bottom. Re-checked on resize and
  // whenever the popup's own size changes (e.g. content loading in).
  const [overflowsViewport, setOverflowsViewport] = useState(false);

  useLayoutEffect(() => {
    const checkFit = () => {
      const el = popupRef.current;
      if (!el) return;
      // 24px (mobile) / 32px (sm+) of viewport padding on top and bottom combined — see the Viewport's own p-3 sm:p-4 below.
      const viewportPadding = window.innerWidth >= 640 ? 32 : 24;
      setOverflowsViewport(el.getBoundingClientRect().height > window.innerHeight - viewportPadding);
    };
    checkFit();
    window.addEventListener("resize", checkFit);
    const observer = new ResizeObserver(checkFit);
    if (popupRef.current) observer.observe(popupRef.current);
    return () => {
      window.removeEventListener("resize", checkFit);
      observer.disconnect();
    };
  }, []);

  return (
    <DialogPrimitive.Portal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport
        className={cn(
          "fixed inset-0 z-50 flex justify-center overflow-y-auto p-3 sm:p-4",
          overflowsViewport ? "items-start" : "items-center",
        )}
      >
        <DialogPrimitive.Popup
          ref={popupRef}
          data-slot="dialog-content"
          className={cn(
            "relative w-full max-w-md rounded-2xl bg-card p-4 shadow-2xl ring-1 ring-ink/10 duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:p-6",
            className,
          )}
          {...props}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("space-y-1.5 pr-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-bold text-ink", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
