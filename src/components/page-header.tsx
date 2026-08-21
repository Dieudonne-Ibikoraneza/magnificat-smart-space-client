"use client";

import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PageHeaderAction = {
  label: string;
  icon: LucideIcon;
};

export type PageHeaderProps = {
  title: string;
  subtitle: ReactNode;
  onOpenMenu: () => void;
  action?: PageHeaderAction;
  children?: ReactNode;
};

export const PageHeader = ({ title, subtitle, onOpenMenu, action, children }: PageHeaderProps) => {
  const ActionIcon = action?.icon;

  return (
    <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-background/80 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 sm:py-5 lg:-mx-10 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{subtitle}</p> : null}
        </div>
      </div>
      {children ??
        (action && ActionIcon ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-6 sm:py-3.5"
          >
            <ActionIcon className="size-5" strokeWidth={1.9} />
            <span className="whitespace-nowrap">{action.label}</span>
          </button>
        ) : null)}
    </header>
  );
};
