"use client";

import { createContext, useContext, useState } from "react";
import {
  WalletCards,
  Bot,
  Boxes,
  LayoutGrid,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";

const navigation = [
  {
    label: "Dashboard",
    href: "/analytics/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/analytics/overview"),
  },
  { label: "Customer Analytics", href: "/analytics/customers", icon: Users },
  { label: "Sales Analytics", href: "/analytics/sales", icon: WalletCards },
  { label: "Tiles Analytics", href: "/analytics/tiles", icon: Boxes },
  { label: "Journey Analytics", href: "/analytics/journey", icon: Workflow },
  { label: "AI Analytics", href: "/analytics/ai", icon: Bot },
  { label: "Account Settings", href: "/analytics/settings", icon: Settings },
] as const;

type AnalyticsMenuContextValue = { openMenu: () => void };
const AnalyticsMenuContext = createContext<AnalyticsMenuContextValue | null>(null);

export const useAnalyticsMenu = () => {
  const context = useContext(AnalyticsMenuContext);
  if (!context) throw new Error("useAnalyticsMenu must be used inside AnalyticsLayout");
  return context;
};

export const AnalyticsPageHeader = (props: Omit<PageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useAnalyticsMenu();
  return <PageHeader {...props} onOpenMenu={openMenu} />;
};

const AnalyticsLayout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);

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

  return (
    <AnalyticsMenuContext.Provider value={{ openMenu }}>
      <div className="min-h-dvh bg-background">
        <DashboardSidebar links={navigation} ariaLabel="Data analyst navigation" />
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <DashboardSidebar
              links={navigation}
              ariaLabel="Data analyst navigation"
              close={closeMenu}
              className={`fixed inset-y-0 left-0 z-50 h-screen w-70 max-w-[85vw] bg-card shadow-2xl lg:hidden ${menuClosing ? "animate-out slide-out-to-left duration-300" : "animate-in slide-in-from-left duration-300"}`}
            />
          </>
        )}
        <main className="min-h-dvh min-w-0 overflow-x-clip px-4 py-6 sm:px-6 lg:ml-70 lg:px-10 lg:py-8 xl:ml-80">
          <div className="mx-auto w-full max-w-360">{children}</div>
        </main>
      </div>
    </AnalyticsMenuContext.Provider>
  );
};

export default AnalyticsLayout;
