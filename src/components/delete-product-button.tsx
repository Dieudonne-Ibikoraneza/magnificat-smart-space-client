"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LoaderCircle, PowerOff, RotateCcw } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

export const DeleteProductButton = ({
  productId,
  productName,
  redirectTo,
  onDeleted,
  trigger,
}: {
  productId: string;
  productName: string;
  /** Navigated to after deactivation — omit when the caller refreshes a list via `onDeleted`. */
  redirectTo?: string;
  /** Called after deactivation (e.g. to reload a list) — runs before `redirectTo` navigation. */
  onDeleted?: () => void;
  /** Custom trigger element (e.g. an icon-only button for list rows) — falls back to the default labeled button when omitted. */
  trigger?: ReactElement;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = "staff.deleteProduct";

  const handleDeactivate = async () => {
    setSaving(true);
    setError(null);
    try {
      await productsApi.remove(productId);
      toast.success(t("staff.deleteProduct.toastDeletedTitle"), {
        description: t("staff.deleteProduct.toastDeletedBody", {
          name: productName,
        }),
      });
      setOpen(false);
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : t(`${key}.toastTryAgain`),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (saving) return;
        if (value) setError(null);
        setOpen(value);
      }}
    >
      <DialogTrigger
        disabled={saving}
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="h-12 w-full gap-2 border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 hover:bg-amber-100 hover:text-amber-900"
            >
              <PowerOff aria-hidden="true" className="size-4" />
              {t(`${key}.${saving ? "deleting" : "delete"}`)}
            </Button>
          )
        }
      />
      <DialogContent
        className="max-w-md p-0 sm:p-0"
        showClose={!saving}
        aria-busy={saving}
      >
        <div className="p-5 sm:p-6">
          <DialogHeader className="space-y-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
              <PowerOff aria-hidden="true" className="size-6" />
            </span>
            <DialogTitle className="text-xl">
              {t(`${key}.confirmTitle`)}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {t(`${key}.confirmDescription`)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 rounded-xl border border-border bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {t(`${key}.tileLabel`)}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-ink">
              {productName}
            </p>
          </div>
          <div className="mt-4 flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
            <RotateCcw aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <p>{t(`${key}.recoveryDescription`)}</p>
          </div>
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <p className="font-semibold">{t(`${key}.toastFailedTitle`)}</p>
              <p className="mt-1">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-0 border-t border-border bg-slate-50/70 p-5 sm:p-6">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setOpen(false)}
            className="h-11 rounded-lg px-5 text-sm font-semibold"
          >
            {t("dash.confirm.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleDeactivate()}
            className="h-11 gap-2 rounded-lg bg-amber-700 px-5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <PowerOff aria-hidden="true" className="size-4" />
            )}
            {t(`${key}.${saving ? "deleting" : "confirmLabel"}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
