"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  MessageSquareText,
  BookOpen,
  Boxes,
  Box,
  FileText,
  LayoutGrid,
  Layers,
  MessagesSquare,
  Settings,
  ShelvingUnit,
  ShoppingCart,
  Sparkles,
  User,
  UserCog,
  Users,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import { SessionPending } from "@/components/api-state";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMenuProvider } from "@/components/dashboard-page-headers";
import { ADMIN_ROLES } from "@/lib/auth-routes";
import { useRequireRole } from "@/lib/require-role";
import { getInitials } from "@/lib/utils";

const navigation = [
  {
    labelKey: "admin.nav.dashboard",
    href: "/admin/overview",
    icon: LayoutGrid,
    sectionKey: "admin.nav.sectionCore",
    active: (pathname: string) => pathname.startsWith("/admin/overview"),
  },
  { labelKey: "admin.nav.orders", href: "/admin/orders", icon: ShoppingCart, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.inventory", href: "/admin/inventory", icon: ShelvingUnit, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.customers", href: "/admin/customers", icon: User, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.designs", href: "/admin/designs", icon: Sparkles, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.negotiations", href: "/admin/negotiations", icon: MessagesSquare, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.collections", href: "/admin/collections", icon: Layers, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.rooms", href: "/admin/rooms", icon: Box, sectionKey: "admin.nav.sectionOperations" },
  { labelKey: "admin.nav.customerAnalytics", href: "/admin/analytics/customers", icon: Users, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.salesAnalytics", href: "/admin/analytics/sales", icon: WalletCards, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.tilesAnalytics", href: "/admin/analytics/tiles", icon: Boxes, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.stockReport", href: "/admin/analytics/stock", icon: FileText, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.journeyAnalytics", href: "/admin/analytics/journey", icon: Workflow, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.aiAnalytics", href: "/admin/analytics/ai", icon: Bot, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.askedQuestions", href: "/admin/asked-questions", icon: MessageSquareText, sectionKey: "admin.nav.sectionAnalytics" },
  { labelKey: "admin.nav.knowledgeBase", href: "/admin/knowledge-base", icon: BookOpen, sectionKey: "admin.nav.sectionManagement" },
  { labelKey: "admin.nav.staff", href: "/admin/staff", icon: UsersRound, sectionKey: "admin.nav.sectionManagement" },
  { labelKey: "admin.nav.systemSettings", href: "/admin/settings", icon: Settings, sectionKey: "admin.nav.sectionManagement" },
  { labelKey: "admin.nav.accountSettings", href: "/admin/account-settings", icon: UserCog, sectionKey: "admin.nav.sectionManagement" },
] as const;

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { user, authorized } = useRequireRole(ADMIN_ROLES);
  const navLinks = navigation.map((link) => ({ ...link, label: t(link.labelKey), section: t(link.sectionKey) }));

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
        <DashboardSidebar links={navLinks} ariaLabel={t("admin.nav.navAria")} user={sidebarUser} />
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={t("admin.nav.closeMenu")}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <DashboardSidebar
              links={navLinks}
              ariaLabel={t("admin.nav.navAria")}
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

export default AdminLayout;
