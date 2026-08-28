"use client";

import { useState, type ReactElement } from "react";
import { TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Generic confirmation dialog for destructive or hard-to-reverse actions (delete, clear, sign out). */
export const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className={`flex size-10 items-center justify-center rounded-full ${destructive ? "bg-red-50 text-red-600" : "bg-secondary text-ink"}`}>
            <TriangleAlert className="size-5" />
          </span>
          <DialogTitle className="pt-3">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-sm font-bold">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            className="h-10 px-5 text-sm font-bold"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
