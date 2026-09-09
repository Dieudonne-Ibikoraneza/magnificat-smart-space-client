"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageMenu } from "@/components/language-menu";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import { stripLocale } from "@/lib/i18n";
import { getInitials } from "@/lib/utils";

const navigationLinks = [
  { href: "/", labelKey: "header.nav.products", match: (pathname: string) => pathname === "/" || pathname.startsWith("/products") },
  { href: "/collections", labelKey: "header.nav.collections", match: (pathname: string) => pathname.startsWith("/collections") },
  { href: "/visualizer", labelKey: "header.nav.visualizer", match: (pathname: string) => pathname.startsWith("/visualizer") },
  { href: "/compare", labelKey: "header.nav.compare", match: (pathname: string) => pathname.startsWith("/compare") },
  { href: "/calculator", labelKey: "header.nav.calculator", match: (pathname: string) => pathname.startsWith("/calculator") },
  { href: "/chatbot", labelKey: "header.nav.chatbot", match: (pathname: string) => pathname.startsWith("/chatbot") },
] as const;

export const SiteHeader = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  // Routes are matched against the locale-free path so `/rw/collections`
  // still lights up the "Collections" tab.
  const routePath = stripLocale(pathname ?? "/");
  const { user } = useCurrentUser();
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const cartLabel =
    cart.count > 0 ? t("header.cartWithCount", { count: cart.count }) : t("header.cart");

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
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
      <div className="mx-auto flex h-20 max-w-360 items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label={t("header.homeAria")} onClick={closeMenu}>
          <Image src="/images/logo.png" alt="Magnificat Smart Space" width={72} height={56} className="h-14 w-18 object-contain" priority />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label={t("header.primaryNav")}>
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.match(routePath) ? "border-b-2 border-amber pb-1 text-sm font-semibold text-ink" : "text-sm font-medium text-muted transition-colors hover:text-ink"}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input className="h-10 rounded-full bg-transparent pl-11 pr-4 text-sm" placeholder={t("header.searchPlaceholder")} />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 text-muted sm:gap-5">
          <LanguageMenu />
          <Link
            href={user ? "/account/settings" : "/auth"}
            className="transition-colors hover:text-ink"
            aria-label={user ? t("header.accountAria", { name: user.fullName }) : t("header.signIn")}
          >
            {user ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white sm:size-5.5">
                {getInitials(user.fullName)}
              </span>
            ) : (
              <UserRound className="size-5 sm:size-4" />
            )}
          </Link>
          <Link
            href="/account/cart"
            className="relative transition-colors hover:text-ink"
            aria-label={cartLabel}
          >
            <ShoppingCart className="size-5 sm:size-4" />
            {cart.count > 0 && (
              <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={menuOpen ? closeMenu : openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")}
            data-menu-toggle
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="mx-auto px-4 pb-2 md:hidden">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="h-10 w-full rounded-full bg-transparent pl-11 pr-4 text-sm" placeholder={t("header.searchPlaceholder")} />
        </div>
      </div>

      {mounted && menuOpen && createPortal(
        <>
          <button
            type="button"
            className={`fixed inset-x-0 bottom-0 top-[8.5rem] z-[60] bg-ink/35 backdrop-blur-[2px] md:top-20 lg:hidden ${menuClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"}`}
            onClick={closeMenu}
            aria-label={t("header.closeMenu")}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[8.5rem] z-[61] overflow-hidden md:top-20 lg:hidden">
            <div id="mobile-navigation" className={`pointer-events-auto bg-white/95 px-4 pb-5 pt-4 shadow-lg backdrop-blur-xl duration-300 ${menuClosing ? "animate-out slide-out-to-top-full" : "animate-in slide-in-from-top-full"}`}>
              <nav className="flex flex-col" aria-label={t("header.mobileNav")}>
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`border-b border-slate-100 py-3.5 text-sm font-semibold ${link.match(routePath) ? "text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </>,
        document.body,
      )}
    </header>
  );
};
