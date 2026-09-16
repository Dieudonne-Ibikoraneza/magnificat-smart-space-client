"use client";

import { useTranslation } from "react-i18next";
import { ApiLoading } from "@/components/api-state";
import { SiteHeader } from "@/components/siteheader";
import { ALL_ROLES } from "@/lib/auth-routes";
import { useRequireRole } from "@/lib/require-role";

/**
 * The storefront used to be reachable anonymously (doc's access model §2 —
 * public routes are only *optionally* authenticated). It's now gated like
 * every other area: any signed-in role gets through (see `ALL_ROLES`), a
 * signed-out visitor is sent to `/auth`. Which controls a signed-in visitor
 * sees once inside (favorites/cart vs. staff tooling) is decided per-page —
 * see `product-card.tsx`, `siteheader.tsx`, and the staff toolbar components.
 */
const SiteLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const { authorized } = useRequireRole(ALL_ROLES);

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <ApiLoading label={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-ink">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-360 min-h-0 flex-1 flex-col px-4 py-2 sm:px-6 sm:pt-8 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default SiteLayout;
