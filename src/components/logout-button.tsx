"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { authApi } from "@/lib/api";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

/** Icon-only sign-out control with a confirmation dialog, shared by every sidebar. */
export const LogoutButton = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { reset: resetCart } = useCart();

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          aria-label="Log out"
          className={cn("rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600", className)}
        >
          <LogOut className="size-5" strokeWidth={1.8} />
        </button>
      }
      title="Log out?"
      description="You'll need to sign in again to access your account."
      confirmLabel="Log out"
      onConfirm={() => {
        // Revokes the refresh token server-side and clears local tokens either
        // way — a failed revoke must never strand the user in a signed-in UI.
        void authApi.logout().then(() => {
          refresh();
          // Not `clear()` — that would delete the cart server-side. Logging
          // out should only stop showing it on this device, not empty it.
          resetCart();
          toast.success("Signed out", { description: "You've been logged out of Magnificat Smart Space." });
          router.push("/auth");
        });
      }}
    />
  );
};
