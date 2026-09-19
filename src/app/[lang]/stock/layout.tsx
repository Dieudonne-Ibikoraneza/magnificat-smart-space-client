"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  LayoutGrid,
  MessagesSquare,
  ShelvingUnit,
  Sparkles,
  Settings,
  ShoppingCart,
  Boxes,
  User,
} from "lucide-react";
import { SessionPending } from "@/components/api-state";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMenuProvider } from "@/components/dashboard-page-headers";
import { STOCK_ROLES } from "@/lib/auth-routes";
import { useRequireRole } from "@/lib/require-role";
import { getInitials } from "@/lib/utils";

const navigation = [
  {
    labelKey: "stock.nav.dashboard",
    href: "/stock/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/stock/overview"),
  },
  { labelKey: "stock.nav.inventory", href: "/stock/inventory", icon: ShelvingUnit },
  { labelKey: "stock.nav.orders", href: "/stock/orders", icon: ShoppingCart },
  { labelKey: "stock.nav.customers", href: "/stock/customers", icon: User },
  { labelKey: "stock.nav.designs", href: "/stock/designs", icon: Sparkles },
  { labelKey: "stock.nav.negotiations", href: "/stock/negotiations", icon: MessagesSquare },
  { labelKey: "stock.nav.collections", href: "/stock/collections", icon: Boxes },
  { labelKey: "stock.nav.reports", href: "/stock/reports", icon: FileText },
  { labelKey: "stock.nav.settings", href: "/stock/settings", icon: Settings },
] as const;

const StockLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { user, authorized } = useRequireRole(STOCK_ROLES);
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
        <DashboardSidebar links={navLinks} ariaLabel={t("stock.nav.navAria")} user={sidebarUser} />
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={t("stock.nav.closeMenu")}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <DashboardSidebar
              links={navLinks}
              ariaLabel={t("stock.nav.navAria")}
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

export default StockLayout;
