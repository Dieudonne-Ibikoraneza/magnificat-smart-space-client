"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export type DashboardSidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: (pathname: string) => boolean;
  section?: string;
};

export type DashboardSidebarUser = {
  initials: string;
  name: string;
  email: string;
};

type DashboardSidebarProps = {
  links: readonly DashboardSidebarLink[];
  close?: () => void;
  ariaLabel?: string;
  user?: DashboardSidebarUser;
  className?: string;
};

const defaultUser: DashboardSidebarUser = {
  initials: "JD",
  name: "John Doe",
  email: "john.doe@example.com",
};

export const DashboardSidebar = ({
  links,
  close,
  ariaLabel = "Dashboard navigation",
  user = defaultUser,
  className = "fixed inset-y-0 left-0 z-30 hidden w-70 bg-card lg:block xl:w-80",
}: DashboardSidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className={className}>
      {close && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-md p-2 text-ink hover:bg-secondary"
        >
          <X className="size-5" />
        </button>
      )}
      <div className="flex h-full min-h-0 flex-col px-5 py-6">
        <div className="shrink-0 px-2 pb-8">
          <Image
            src="/images/logo.png"
            alt="Magnificat Smart Space"
            width={240}
            height={180}
            className="mx-auto w-40 object-contain"
          />
        </div>
        <nav className="scrollbar-hide min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto" aria-label={ariaLabel}>
          {links.map(({ label, href, icon: Icon, active, section }, index) => {
            const isActive = active?.(pathname) ?? pathname.startsWith(href);
            const showSectionHeading = section && section !== links[index - 1]?.section;

            return (
              <div key={href}>
                {showSectionHeading && (
                  <p
                    className={`px-4 text-[11px] font-bold tracking-wide text-muted-foreground/70 uppercase ${index === 0 ? "pb-2" : "pt-5 pb-2"}`}
                  >
                    {section}
                  </p>
                )}
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={close}
                  className={`group relative flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-[15px] transition-all duration-200 ${isActive ? "bg-[#f8fce7] font-semibold text-ink" : "font-medium text-ink/75 hover:translate-x-1 hover:bg-[#fbfdec] hover:text-ink"}`}
                >
                  <span
                    className={`absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary ${isActive ? "scale-y-100" : "scale-y-0"}`}
                  />
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="mt-4 flex shrink-0 items-center gap-3 rounded-xl bg-[#F9F9F9] px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-card">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <LogoutButton className="text-destructive hover:bg-destructive/10" />
        </div>
      </div>
    </aside>
  );
};
