"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export const toastManager = ToastPrimitive.createToastManager();

const toastIcon: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastIconStyles: Record<ToastVariant, string> = {
  success: "bg-green-50 text-green-600",
  error: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-blue-50 text-blue-600",
};

type ToastOptions = { description?: string; timeout?: number };

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    toastManager.add({ title, type: "success", ...options }),
  error: (title: string, options?: ToastOptions) =>
    toastManager.add({ title, type: "error", ...options }),
  warning: (title: string, options?: ToastOptions) =>
    toastManager.add({ title, type: "warning", ...options }),
  info: (title: string, options?: ToastOptions) =>
    toastManager.add({ title, type: "info", ...options }),
};

const ToastList = () => {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => {
    const variant = (item.type as ToastVariant) in toastIcon ? (item.type as ToastVariant) : "info";
    const Icon = toastIcon[variant];

    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        className={cn(
          "relative w-full rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border transition-all duration-300 select-none",
          "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
          "data-[ending-style]:opacity-0",
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", toastIconStyles[variant])}>
            <Icon className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <ToastPrimitive.Title className="text-sm font-bold text-ink" />
            <ToastPrimitive.Description className="mt-0.5 text-xs text-muted-foreground" />
          </div>
          <ToastPrimitive.Close
            aria-label="Close notification"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-ink"
          >
            <X className="size-4" />
          </ToastPrimitive.Close>
        </div>
      </ToastPrimitive.Root>
    );
  });
};

export const Toaster = () => (
  <ToastPrimitive.Provider toastManager={toastManager} timeout={4500}>
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-4 z-100 mx-auto flex w-auto max-w-sm flex-col-reverse gap-2 outline-none sm:inset-x-auto sm:right-6 sm:bottom-6">
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  </ToastPrimitive.Provider>
);
