"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";
import { tokenStore } from "@/lib/api";
import { roleHomePath } from "@/lib/auth-routes";
import type { Role } from "@/lib/api/types";

/**
 * Gates a layout to a set of roles: sends a signed-out visitor to `/auth`,
 * and a signed-in one whose role doesn't belong here to their own dashboard
 * instead — so a client can't sit on `/stock/overview` just by typing the
 * URL, and a stock manager doesn't land on a sales-only screen by mistake.
 *
 * Returns `authorized` so the layout can hold off rendering its real content
 * (and the data fetches that come with it) until the check has passed.
 */
export const useRequireRole = (allowed: readonly Role[]) => {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const allowedKey = allowed.join(",");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // A token is still sitting in storage right after login navigates here,
      // before the provider's own refresh has resolved — that's "still
      // checking," not "signed out," so wait for it instead of bouncing to
      // /auth. (An invalid/expired token never lingers: the provider clears
      // it the moment a check fails, so this can't wait forever on a dead one.)
      if (tokenStore.getAccessToken()) return;
      router.replace("/auth");
      return;
    }
    if (!allowedKey.split(",").includes(user.role)) {
      router.replace(roleHomePath(user.role));
    }
  }, [user, loading, router, allowedKey]);

  return {
    user,
    loading,
    authorized: !loading && !!user && allowedKey.split(",").includes(user.role),
  };
};
