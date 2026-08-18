"use client";

import { Menu, PackagePlus, UserPlus } from "lucide-react";
import { useSalesMenu } from "@/app/sales/layout";

type SalesPageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionIcon: "packagePlus" | "userPlus";
};

const actionIcons = {
  packagePlus: PackagePlus,
  userPlus: UserPlus,
} as const;

export const SalesPageHeader = ({
  title,
  subtitle,
  actionLabel,
  actionIcon,
}: SalesPageHeaderProps) => {
  const { openMenu } = useSalesMenu();
  const ActionIcon = actionIcons[actionIcon];

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={openMenu}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{title}</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-6 sm:py-3.5"
      >
        <ActionIcon className="size-5" strokeWidth={1.9} />
        <span className="whitespace-nowrap">{actionLabel}</span>
      </button>
    </header>
  );
};
