"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ApiError, collectionsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ReactivateCollectionButton({
  collectionId,
  collectionName,
  onReactivated,
  compact = false,
}: {
  collectionId: string;
  collectionName: string;
  onReactivated: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = "staff.reactivateCollection";

  const reactivate = async () => {
    setSaving(true);
    try {
      await collectionsApi.update(collectionId, { isActive: true });
      toast.success(t(`${key}.success`), {
        description: t(`${key}.successDescription`, { name: collectionName }),
      });
      setOpen(false);
      onReactivated();
    } catch (cause) {
      toast.error(t(`${key}.failed`), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("staff.deleteCollection.toastTryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) setOpen(value);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={compact ? "icon-sm" : "default"}
            disabled={saving}
            aria-label={t(`${key}.aria`, { name: collectionName })}
            className={cn(
              "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800",
              compact ? "h-12 w-10 rounded-none border-0" : "h-12 gap-2 px-4 text-sm font-semibold",
            )}
          >
            <RotateCcw className="size-4" />
            {!compact && t(`${key}.button`)}
          </Button>
        }
      />
      <DialogContent className="max-w-sm" showClose={!saving}>
        <DialogHeader>
          <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <RotateCcw aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{t(`${key}.title`, { name: collectionName })}</DialogTitle>
          <DialogDescription className="leading-6">
            {t(`${key}.description`)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setOpen(false)}
            className="h-10 px-5 text-sm font-bold"
          >
            {t("dash.confirm.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void reactivate()}
            className="h-10 gap-2 bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {saving && (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            )}
            {t(`${key}.${saving ? "saving" : "button"}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
