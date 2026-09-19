"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  WalletCards,
  Bot,
  Boxes,
  FileText,
  LayoutGrid,
  MessageSquareText,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import { SessionPending } from "@/components/api-state";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMenuProvider } from "@/components/dashboard-page-headers";
import { ANALYTICS_ROLES } from "@/lib/auth-routes";
import { useRequireRole } from "@/lib/require-role";
import { getInitials } from "@/lib/utils";

const navigation = [
  {
    labelKey: "analytics.nav.dashboard",
    href: "/analytics/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/analytics/overview"),
  },
  { labelKey: "analytics.nav.customers", href: "/analytics/customers", icon: Users },
  { labelKey: "analytics.nav.sales", href: "/analytics/sales", icon: WalletCards },
  { labelKey: "analytics.nav.tiles", href: "/analytics/tiles", icon: Boxes },
  { labelKey: "analytics.nav.journey", href: "/analytics/journey", icon: Workflow },
  { labelKey: "analytics.nav.ai", href: "/analytics/ai", icon: Bot },
  { labelKey: "analytics.nav.stockReport", href: "/analytics/stock", icon: FileText },
  { labelKey: "analytics.nav.askedQuestions", href: "/analytics/asked-questions", icon: MessageSquareText },
  { labelKey: "analytics.nav.settings", href: "/analytics/settings", icon: Settings },
] as const;

const AnalyticsLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { user, authorized } = useRequireRole(ANALYTICS_ROLES);
  const navLinks = navigation.map((link) => ({ ...link, label: t(link.labelKey) }));

  const openMenu = () => {
    setMenuClosing(false);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 300);
  };

  if (!authorized || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <SessionPending label={t("staff.loading")} />
      </div>
    );
  }

  const sidebarUser = { initials: getInitials(user.fullName), name: user.fullName, email: user.email ?? "" };

  return (
    <DashboardMenuProvider openMenu={openMenu}>
      <div className="min-h-dvh bg-background">
        <DashboardSidebar links={navLinks} ariaLabel={t("analytics.nav.navAria")} user={sidebarUser} />
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={t("analytics.nav.closeMenu")}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <DashboardSidebar
              links={navLinks}
              ariaLabel={t("analytics.nav.navAria")}
              user={sidebarUser}
              close={closeMenu}
              className={`fixed inset-y-0 left-0 z-50 h-screen w-70 max-w-[85vw] bg-card shadow-2xl lg:hidden ${menuClosing ? "animate-out slide-out-to-left duration-300" : "animate-in slide-in-from-left duration-300"}`}
            />
          </>
        )}
        <main className="min-h-dvh min-w-0 overflow-x-clip px-4 py-6 sm:px-6 lg:ml-70 lg:px-10 lg:py-8 xl:ml-80">
          <div className="mx-auto w-full max-w-360">{children}</div>
        </main>
      </div>
    </DashboardMenuProvider>
  );
};

export default AnalyticsLayout;
