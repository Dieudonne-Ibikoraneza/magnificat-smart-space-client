"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Globe2,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navigationLinks = [
  { href: "/", label: "Products", match: (pathname: string) => pathname === "/" || pathname.startsWith("/products") },
  { href: "/collections", label: "Collections", match: (pathname: string) => pathname.startsWith("/collections") },
  { href: "/visualizer", label: "3D Visualizer", match: (pathname: string) => pathname.startsWith("/visualizer") },
  { href: "/chatbot", label: "AI Chatbot", match: (pathname: string) => pathname.startsWith("/chatbot") },
];

export const SiteHeader = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

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
        <Link href="/" className="shrink-0" aria-label="Magnificat Smart Space home" onClick={closeMenu}>
          <Image src="/images/logo.png" alt="Magnificat Smart Space" width={72} height={56} className="h-14 w-18 object-contain" priority />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.match(pathname) ? "border-b-2 border-amber pb-1 text-sm font-semibold text-ink" : "text-sm font-medium text-muted transition-colors hover:text-ink"}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input className="h-10 rounded-full bg-transparent pl-11 pr-4 text-sm" placeholder="Search for tiles, categories, or sizes..." />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 text-muted sm:gap-5">
          <button type="button" className="hidden items-center gap-1 text-sm font-medium transition-colors hover:text-ink sm:flex" aria-label="Change language">
            <Globe2 className="size-4" /> EN
          </button>
          <Link href="/account/settings" className="transition-colors hover:text-ink" aria-label="Account"><UserRound className="size-5 sm:size-4" /></Link>
          <Link href="/account/cart" className="relative transition-colors hover:text-ink" aria-label="Shopping cart">
            <ShoppingCart className="size-5 sm:size-4" />
            <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-white">2</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={menuOpen ? closeMenu : openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            data-menu-toggle
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="mx-auto px-4 pb-2 md:hidden">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="h-10 w-full rounded-full bg-transparent pl-11 pr-4 text-sm" placeholder="Search for tiles, categories, or sizes..." />
        </div>
      </div>

      {mounted && menuOpen && createPortal(
        <>
          <button
            type="button"
            className={`fixed inset-x-0 bottom-0 top-[8.5rem] z-[60] bg-ink/35 backdrop-blur-[2px] md:top-20 lg:hidden ${menuClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"}`}
            onClick={closeMenu}
            aria-label="Close navigation menu"
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[8.5rem] z-[61] overflow-hidden md:top-20 lg:hidden">
            <div id="mobile-navigation" className={`pointer-events-auto bg-white/95 px-4 pb-5 pt-4 shadow-lg backdrop-blur-xl duration-300 ${menuClosing ? "animate-out slide-out-to-top-full" : "animate-in slide-in-from-top-full"}`}>
              <nav className="flex flex-col" aria-label="Mobile navigation">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`border-b border-slate-100 py-3.5 text-sm font-semibold ${link.match(pathname) ? "text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button type="button" className="mt-4 flex items-center gap-2 text-sm font-medium text-muted hover:text-ink" aria-label="Change language">
                <Globe2 className="size-4" /> English (EN)
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </header>
  );
};
