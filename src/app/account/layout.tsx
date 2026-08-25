"use client";

import { useState } from "react";
import { History, Menu, Settings, ShoppingCart, Star } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SiteHeader } from "@/components/siteheader";

const accountNavigation = [
  { href: "/account/cart", label: "My Cart", icon: ShoppingCart },
  { href: "/account/orders", label: "My Orders", icon: History },
  { href: "/account/favorites", label: "Favorites", icon: Star },
  {
    href: "/account/settings",
    label: "Account Settings",
    icon: Settings,
    active: (pathname: string) => pathname === "/account" || pathname.startsWith("/account/settings"),
  },
] as const;

const AccountLayout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-ink">
      <SiteHeader />
      <DashboardSidebar
        links={accountNavigation}
        ariaLabel="Account navigation"
        className="fixed inset-y-0 left-0 top-20 z-30 hidden h-[calc(100vh-5rem)] w-70 bg-card lg:block xl:w-80"
      />
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-x-0 bottom-0 top-20 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          />
          <DashboardSidebar
            links={accountNavigation}
            ariaLabel="Account navigation"
            close={() => setMenuOpen(false)}
            className="fixed left-4 right-4 top-24 z-50 max-h-[calc(100vh-8rem)] w-auto animate-in fade-in slide-in-from-top-4 overflow-y-auto rounded-2xl bg-card shadow-2xl duration-200 sm:left-6 sm:right-auto sm:w-84 lg:hidden"
          />
        </>
      )}
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:ml-70 lg:px-8 xl:ml-80 xl:px-10">
        <div className="mb-6 flex items-center lg:hidden">
          <button
            type="button"
            aria-label="Open account menu"
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary"
          >
            <Menu className="size-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-ink">Account menu</span>
        </div>
        {children}
      </main>
    </div>
  );
};

export default AccountLayout;
