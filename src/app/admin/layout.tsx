"use client";

import { createContext, useContext, useState } from "react";
import {
  Bot,
  Boxes,
  LayoutGrid,
  Layers,
  Settings,
  ShelvingUnit,
  ShoppingCart,
  User,
  UserCog,
  Users,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin/overview",
    icon: LayoutGrid,
    section: "Core",
    active: (pathname: string) => pathname.startsWith("/admin/overview"),
  },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, section: "Operations" },
  { label: "Stock & Inventory", href: "/admin/inventory", icon: ShelvingUnit, section: "Operations" },
  { label: "Customers", href: "/admin/customers", icon: User, section: "Operations" },
  { label: "Collections", href: "/admin/collections", icon: Layers, section: "Operations" },
  { label: "Customer Analytics", href: "/admin/analytics/customers", icon: Users, section: "Analytics" },
  { label: "Sales Analytics", href: "/admin/analytics/sales", icon: WalletCards, section: "Analytics" },
  { label: "Tiles Analytics", href: "/admin/analytics/tiles", icon: Boxes, section: "Analytics" },
  { label: "Journey Analytics", href: "/admin/analytics/journey", icon: Workflow, section: "Analytics" },
  { label: "AI Analytics", href: "/admin/analytics/ai", icon: Bot, section: "Analytics" },
  { label: "Staff", href: "/admin/staff", icon: UsersRound, section: "Management" },
  { label: "System Settings", href: "/admin/settings", icon: Settings, section: "Management" },
  { label: "Account Settings", href: "/admin/account-settings", icon: UserCog, section: "Management" },
] as const;

type AdminMenuContextValue = { openMenu: () => void };
const AdminMenuContext = createContext<AdminMenuContextValue | null>(null);

export const useAdminMenu = () => {
  const context = useContext(AdminMenuContext);
  if (!context) throw new Error("useAdminMenu must be used inside AdminLayout");
  return context;
};

export const AdminPageHeader = (props: Omit<PageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useAdminMenu();
  return <PageHeader {...props} onOpenMenu={openMenu} />;
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
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
    <AdminMenuContext.Provider value={{ openMenu }}>
      <div className="min-h-dvh bg-background">
        <DashboardSidebar links={navigation} ariaLabel="Admin navigation" />
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
              ariaLabel="Admin navigation"
              close={closeMenu}
              className={`fixed inset-y-0 left-0 z-50 h-screen w-70 max-w-[85vw] bg-card shadow-2xl lg:hidden ${menuClosing ? "animate-out slide-out-to-left duration-300" : "animate-in slide-in-from-left duration-300"}`}
            />
          </>
        )}
        <main className="min-h-dvh min-w-0 overflow-x-clip px-4 py-6 sm:px-6 lg:ml-70 lg:px-10 lg:py-8 xl:ml-80">
          <div className="mx-auto w-full max-w-360">{children}</div>
        </main>
      </div>
    </AdminMenuContext.Provider>
  );
};

export default AdminLayout;
