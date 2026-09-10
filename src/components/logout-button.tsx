"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { authApi } from "@/lib/api";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

/** Icon-only sign-out control with a confirmation dialog, shared by every sidebar. */
export const LogoutButton = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { reset: resetCart } = useCart();

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          aria-label={t("dash.logout.aria")}
          className={cn("rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600", className)}
        >
          <LogOut className="size-5" strokeWidth={1.8} />
        </button>
      }
      title={t("dash.logout.title")}
      description={t("dash.logout.description")}
      confirmLabel={t("dash.logout.confirm")}
      onConfirm={() => {
        // Revokes the refresh token server-side and clears local tokens either
        // way — a failed revoke must never strand the user in a signed-in UI.
        void authApi.logout().then(() => {
          refresh();
          // Not `clear()` — that would delete the cart server-side. Logging
          // out should only stop showing it on this device, not empty it.
          resetCart();
          toast.success(t("dash.logout.toastTitle"), { description: t("dash.logout.toastBody") });
          router.push("/auth");
        });
      }}
    />
  );
};
