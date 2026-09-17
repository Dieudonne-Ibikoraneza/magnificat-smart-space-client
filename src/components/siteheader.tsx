"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageMenu } from "@/components/language-menu";
import { roleAccountSettingsPath, roleHomePath } from "@/lib/auth-routes";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  // Routes are matched against the locale-free path so `/rw/collections`
  // still lights up the "Collections" tab.
  const routePath = stripLocale(pathname ?? "/");
  const { user } = useCurrentUser();
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const isProductsRoute = routePath === "/" || routePath.startsWith("/products");
  const urlSearchValue = isProductsRoute ? (searchParams.get("search") ?? "") : "";
  const [searchValue, setSearchValue] = useState(urlSearchValue);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The URL's `?search=` can change from outside this component (browser
  // back/forward, navigating away and back) — resync by adjusting state
  // during render rather than in an effect (React docs' "adjusting state
  // when a prop changes" pattern).
  const [syncedSearchValue, setSyncedSearchValue] = useState(urlSearchValue);
  if (urlSearchValue !== syncedSearchValue) {
    setSyncedSearchValue(urlSearchValue);
    setSearchValue(urlSearchValue);
  }

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const navigateToSearch = (value: string) => {
    const query = value.trim();
    // The catalog is the root route, not `/products` — that path is only
    // used for individual product detail pages (`/products/[id]`).
    router.push(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => navigateToSearch(value), 300);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    navigateToSearch(searchValue);
  };
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
          <form className="relative" role="search" onSubmit={handleSearchSubmit}>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-10 rounded-full bg-transparent pl-11 pr-4 text-sm"
              placeholder={t("header.searchPlaceholder")}
              aria-label={t("header.searchPlaceholder")}
            />
          </form>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 text-muted sm:gap-5">
          <LanguageMenu />
          {user && user.role !== "CLIENT" && (
            <Link
              href={roleHomePath(user.role)}
              className="hidden items-center gap-1.5 text-sm font-semibold transition-colors hover:text-ink sm:flex"
              aria-label={t("header.dashboardAria")}
            >
              <LayoutDashboard className="size-4" />
              {t("header.dashboard")}
            </Link>
          )}
          <Link
            href={user ? roleAccountSettingsPath(user.role) : "/auth"}
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
          {(!user || user.role === "CLIENT") && (
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
          )}
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
        <form className="relative" role="search" onSubmit={handleSearchSubmit}>
          <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="h-10 w-full rounded-full bg-transparent pl-11 pr-4 text-sm"
            placeholder={t("header.searchPlaceholder")}
            aria-label={t("header.searchPlaceholder")}
          />
        </form>
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
                {user && user.role !== "CLIENT" && (
                  <Link
                    href={roleHomePath(user.role)}
                    onClick={closeMenu}
                    className="flex items-center gap-2 border-b border-slate-100 py-3.5 text-sm font-semibold text-muted hover:text-ink sm:hidden"
                  >
                    <LayoutDashboard className="size-4" />
                    {t("header.dashboard")}
                  </Link>
                )}
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
