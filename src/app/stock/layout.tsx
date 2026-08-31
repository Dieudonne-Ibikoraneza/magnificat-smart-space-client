"use client";

import { createContext, useContext, useState } from "react";
import {
  FileText,
  LayoutGrid,
  MessagesSquare,
  ShelvingUnit,
  Settings,
  ShoppingCart,
  Boxes,
  User,
} from "lucide-react";
import { ApiLoading } from "@/components/api-state";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";
import { DetailPageHeader, type DetailPageHeaderProps } from "@/components/detail-page-header";
import { useRequireRole } from "@/lib/require-role";
import { getInitials } from "@/lib/utils";

const navigation = [
  {
    label: "Dashboard",
    href: "/stock/overview",
    icon: LayoutGrid,
    active: (pathname: string) => pathname.startsWith("/stock/overview"),
  },
  { label: "Inventory", href: "/stock/inventory", icon: ShelvingUnit },
  { label: "Orders", href: "/stock/orders", icon: ShoppingCart },
  { label: "Customers", href: "/stock/customers", icon: User },
  { label: "Negotiations", href: "/stock/negotiations", icon: MessagesSquare },
  { label: "Collections", href: "/stock/collections", icon: Boxes },
  { label: "Reports", href: "/stock/reports", icon: FileText },
  { label: "Account Settings", href: "/stock/settings", icon: Settings },
] as const;

type StockMenuContextValue = { openMenu: () => void };
const StockMenuContext = createContext<StockMenuContextValue | null>(null);

export const useStockMenu = () => {
  const context = useContext(StockMenuContext);
  if (!context) throw new Error("useStockMenu must be used inside StockLayout");
  return context;
};

export const StockPageHeader = (props: Omit<PageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useStockMenu();
  return <PageHeader {...props} onOpenMenu={openMenu} />;
};

export const StockDetailHeader = (props: Omit<DetailPageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useStockMenu();
  return <DetailPageHeader {...props} onOpenMenu={openMenu} />;
};

const StockLayout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { user, authorized } = useRequireRole(["STOCK_MANAGER", "ADMIN"]);

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
        <ApiLoading label="Loading…" />
      </div>
    );
  }

  const sidebarUser = { initials: getInitials(user.fullName), name: user.fullName, email: user.email ?? "" };

  return (
    <StockMenuContext.Provider value={{ openMenu }}>
      <div className="min-h-dvh bg-background">
        <DashboardSidebar links={navigation} ariaLabel="Stock manager navigation" user={sidebarUser} />
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
              ariaLabel="Stock manager navigation"
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
    </StockMenuContext.Provider>
  );
};

export default StockLayout;
