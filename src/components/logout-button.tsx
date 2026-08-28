"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Icon-only sign-out control with a confirmation dialog, shared by every sidebar. */
export const LogoutButton = ({ className }: { className?: string }) => {
  const router = useRouter();

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
          toast.success("Signed out", { description: "You've been logged out of Magnificat Smart Space." });
          router.push("/auth");
        });
      }}
    />
  );
};
