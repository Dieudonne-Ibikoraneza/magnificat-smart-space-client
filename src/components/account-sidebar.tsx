"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  Settings,
  ShoppingCart,
  Star,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const accountLinks = [
  { href: "/account/cart", label: "My Cart", icon: ShoppingCart },
  { href: "/account/orders", label: "My Orders", icon: History },
  { href: "/account/favorites", label: "Favorites", icon: Star },
  { href: "/account/settings", label: "Account Settings", icon: Settings },
];

export const AccountSidebar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeDrawer = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  };

  const navigation = (mobile = false) => (
    <nav
      className={`scrollbar-hide flex gap-2 ${mobile ? "flex-col" : "overflow-x-auto lg:flex-col"}`}
      aria-label="Account navigation"
    >
      {accountLinks.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/account/settings" && pathname === "/account");
        return (
          <Link
            key={href}
            href={href}
            onClick={closeDrawer}
            className={`flex min-w-max items-center gap-4 rounded-xs px-4 py-4 text-sm transition-colors lg:min-w-0 ${active ? "bg-primary/15 font-bold text-ink lg:border-r-4 lg:border-primary" : "font-medium text-ink hover:bg-muted-background"}`}
          >
            <Icon className="size-6 shrink-0" strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const profile = (className = "") => (
    <div
      className={`${className} flex items-center justify-between rounded-md bg-muted-background p-3`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
          JD
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">John Doe</p>
          <p className="truncate text-xs text-muted">john.doe@example.com</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Log out"
        className="text-red-500 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="size-5" />
      </Button>
    </div>
  );

  return (
    <aside className="sticky top-32 z-40 shrink-0 bg-white lg:top-20 lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)] lg:w-64 xl:w-72">
      <div className="border-b border-slate-100 bg-background px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              setClosing(false);
              setOpen(true);
            }}
            className="flex items-center gap-3 cursor-pointer text-base font-semibold"
          >
            <Menu className="size-5" /> Account menu
          </div>
          <span className="text-base font-semibold text-ink">
            {accountLinks.find(({ href }) => pathname === href)?.label ??
              "Account Settings"}
          </span>
        </div>
      </div>
      <div className="hidden h-full flex-col justify-between gap-6 p-4 sm:p-6 lg:flex lg:p-8">
        {navigation()}
        {profile()}
      </div>
      {open &&
        createPortal(
          <div
            className={`fixed inset-0 z-100 lg:hidden ${closing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"}`}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={closeDrawer}
              aria-label="Close account menu"
              className="absolute inset-0 h-full w-full rounded-none bg-ink/40 hover:bg-ink/40"
            />
            <div
              className={`absolute bottom-0 left-0 top-0 flex w-[min(76vw,280px)] flex-col gap-8 overflow-y-auto bg-white p-5 shadow-2xl ${closing ? "animate-out slide-out-to-left duration-300" : "animate-in slide-in-from-left duration-300"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Account</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  aria-label="Close account menu"
                >
                  <X className="size-5" />
                </Button>
              </div>
              {navigation(true)}
              {profile("mt-auto")}
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
};
