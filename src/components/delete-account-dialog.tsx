"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { authApi, usersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";

/**
 * "Account Management" section shared by every role's Account Settings page.
 * Closing an account deactivates it and revokes every session server-side —
 * it doesn't erase order/payment history — so afterwards we just clear the
 * local session and send the user back to sign-in, the same as logging out.
 */
export const DeleteAccountDialog = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { reset: resetCart } = useCart();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closed, setClosed] = useState(false);

  const handleConfirm = async () => {
    if (confirmation !== "Delete") return;
    setSubmitting(true);
    try {
      await usersApi.closeMyAccount();
      // Every session was just revoked server-side; this also clears the (now dead) session cookie.
      await authApi.logout();
      resetCart();
      refresh();
      setClosed(true);
      setOpen(false);
      toast.success(t("dash.deleteAccount.toastClosedTitle"), { description: t("dash.deleteAccount.toastClosedBody") });
      router.push("/auth");
    } catch (cause) {
      toast.error(t("dash.deleteAccount.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("dash.tryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-5 rounded-lg border border-red-200 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-ink">{t("dash.deleteAccount.heading")}</h3>
      <p className="mt-3 max-w-5xl text-sm leading-5 text-muted">
        {t("dash.deleteAccount.body")}
      </p>
      {closed ? (
        <p className="mt-5 text-sm font-semibold text-red-600">{t("dash.deleteAccount.closed")}</p>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setConfirmation("");
          }}
        >
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="mt-5 h-12 gap-3 border-red-500 px-5 text-base font-bold text-red-500 hover:border-red-600 hover:bg-red-50 hover:text-red-600"
              />
            }
          >
            <Trash2 className="size-5" /> {t("dash.deleteAccount.trigger")}
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("dash.deleteAccount.dialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("dash.deleteAccount.dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <label className="mt-6 block text-sm font-semibold text-ink">
              {t("dash.deleteAccount.typePrefix")} <span className="text-red-500">Delete</span> {t("dash.deleteAccount.typeSuffix")}
              <Input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Delete"
                className="mt-2 h-12"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="h-11 px-5 text-sm font-bold text-ink"
              >
                {t("dash.deleteAccount.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirmation !== "Delete" || submitting}
                onClick={() => void handleConfirm()}
                className="h-11 px-5 text-sm font-bold disabled:opacity-60"
              >
                {submitting ? t("dash.deleteAccount.deleting") : t("dash.deleteAccount.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
