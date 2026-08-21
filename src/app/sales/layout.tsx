"use client";

import { createContext, useContext, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  LayoutGrid,
  ShoppingCart,
  Users,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";

const navigation = [
  {
    label: "Dashboard",
    href: "/sales/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/sales/overview"),
  },
  { label: "Customers", href: "/sales/customers", icon: Users },
  { label: "Orders", href: "/sales/orders", icon: ShoppingCart },
  { label: "Catalog", href: "/sales/catalog", icon: BriefcaseBusiness },
  { label: "Account Settings", href: "/sales/settings", icon: BarChart3 },
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

const SalesLayout = ({ children }: { children: React.ReactNode }) => {
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
    <SalesMenuContext.Provider value={{ openMenu }}>
      <div className="min-h-dvh bg-background">
      <DashboardSidebar links={navigation} ariaLabel="Sales navigation" />
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
            ariaLabel="Sales navigation"
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
