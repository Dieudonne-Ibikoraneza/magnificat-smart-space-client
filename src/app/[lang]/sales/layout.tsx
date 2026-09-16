"use client";

import { createContext, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BriefcaseBusiness,
  LayoutGrid,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { ApiLoading } from "@/components/api-state";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";
import { DetailPageHeader, type DetailPageHeaderProps } from "@/components/detail-page-header";
import { SALES_ROLES } from "@/lib/auth-routes";
import { useRequireRole } from "@/lib/require-role";
import { getInitials } from "@/lib/utils";

const navigation = [
  {
    labelKey: "sales.nav.dashboard",
    href: "/sales/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/sales/overview"),
  },
  { labelKey: "sales.nav.customers", href: "/sales/customers", icon: Users },
  { labelKey: "sales.nav.orders", href: "/sales/orders", icon: ShoppingCart },
  { labelKey: "sales.nav.catalog", href: "/sales/catalog", icon: BriefcaseBusiness },
  { labelKey: "sales.nav.designs", href: "/sales/designs", icon: Sparkles },
  { labelKey: "sales.nav.settings", href: "/sales/settings", icon: BarChart3 },
] as const;

type SalesMenuContextValue = {
  openMenu: () => void;
};

const SalesMenuContext = createContext<SalesMenuContextValue | null>(null);

export const useSalesMenu = () => {
  const context = useContext(SalesMenuContext);

  if (!context) {
    throw new Error("useSalesMenu must be used inside SalesLayout");
  }

  return context;
};

export const SalesPageHeader = (props: Omit<PageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useSalesMenu();
  return <PageHeader {...props} onOpenMenu={openMenu} />;
};

export const SalesDetailHeader = (props: Omit<DetailPageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useSalesMenu();
  return <DetailPageHeader {...props} onOpenMenu={openMenu} />;
};

const SalesLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { user, authorized } = useRequireRole(SALES_ROLES);
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
        <ApiLoading label={t("staff.loading")} />
      </div>
    );
  }

  const sidebarUser = { initials: getInitials(user.fullName), name: user.fullName, email: user.email ?? "" };

  return (
    <SalesMenuContext.Provider value={{ openMenu }}>
      <div className="min-h-dvh bg-background">
      <DashboardSidebar links={navLinks} ariaLabel={t("sales.nav.navAria")} user={sidebarUser} />
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label={t("sales.nav.closeMenu")}
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          />
          <DashboardSidebar
            links={navLinks}
            ariaLabel={t("sales.nav.navAria")}
            user={sidebarUser}
            close={closeMenu}
            className={`fixed inset-y-0 left-0 z-50 h-screen w-70 max-w-[85vw] bg-card shadow-2xl lg:hidden ${menuClosing ? "animate-out slide-out-to-left duration-300" : "animate-in slide-in-from-left duration-300"}`}
          />
        </>
      )}
        <main className="min-h-dvh min-w-0 overflow-x-clip px-4 py-6 sm:px-6 lg:ml-70 lg:px-10 lg:py-8 xl:ml-80">
          <div className="mx-auto w-full max-w-360">
            {children}
          </div>
        </main>
      </div>
    </SalesMenuContext.Provider>
  );
};

export default SalesLayout;
