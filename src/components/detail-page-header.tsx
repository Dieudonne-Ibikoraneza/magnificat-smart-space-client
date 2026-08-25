"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, MoreHorizontal } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DetailBreadcrumbItem = { label: string; href?: string };

export type DetailPageHeaderProps = {
  breadcrumbs: DetailBreadcrumbItem[];
  title: ReactNode;
  onOpenMenu: () => void;
  actions?: ReactNode;
  meta?: ReactNode;
};

const Crumb = ({ item }: { item: DetailBreadcrumbItem }) => (
  <BreadcrumbItem className="min-w-0 shrink">
    {item.href ? (
      <BreadcrumbLink render={<Link href={item.href} />} className="block truncate">
        {item.label}
      </BreadcrumbLink>
    ) : (
      <BreadcrumbPage className="block truncate">{item.label}</BreadcrumbPage>
    )}
  </BreadcrumbItem>
);

const CrumbTrail = ({ items }: { items: DetailBreadcrumbItem[] }) => (
  <BreadcrumbList className="flex-nowrap">
    {items.map((item, index) => (
      <Fragment key={item.label}>
        {index > 0 && <BreadcrumbSeparator />}
        <Crumb item={item} />
      </Fragment>
    ))}
  </BreadcrumbList>
);

/** Single-line breadcrumb trail; middle links collapse behind a "..." menu once they no longer fit. */
const DetailBreadcrumbTrail = ({ items }: { items: DetailBreadcrumbItem[] }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const hiddenItems = items.slice(1, -1);
  const canCollapse = hiddenItems.length > 0;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    if (!wrapper || !measure || !canCollapse) return;

    const checkOverflow = () => setCollapsed(measure.scrollWidth > wrapper.clientWidth);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [items, canCollapse]);

  const first = items[0];
  const last = items[items.length - 1];
  const showCollapsed = collapsed && canCollapse;

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute top-0 left-0 flex items-center whitespace-nowrap"
      >
        <CrumbTrail items={items} />
      </div>

      <Breadcrumb className="min-w-0 overflow-hidden">
        {showCollapsed ? (
          <BreadcrumbList className="flex-nowrap">
            <Crumb item={first} />
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Show hidden breadcrumb links"
                      className="flex size-5 items-center justify-center rounded hover:bg-secondary hover:text-ink"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hiddenItems.map((item) => (
                    <DropdownMenuItem key={item.label} render={item.href ? <Link href={item.href} /> : undefined}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <Crumb item={last} />
          </BreadcrumbList>
        ) : (
          <CrumbTrail items={items} />
        )}
      </Breadcrumb>
    </div>
  );
};

export const DetailPageHeader = ({ breadcrumbs, title, onOpenMenu, actions, meta }: DetailPageHeaderProps) => (
  <div className="pb-5 sm:pb-6">
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMenu}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <DetailBreadcrumbTrail items={breadcrumbs} />
    </div>

    <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
      <h1 className="text-2xl font-black text-ink sm:text-3xl lg:text-4xl">{title}</h1>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>

    {meta ? <div className="mt-3 flex flex-wrap items-center gap-3">{meta}</div> : null}
  </div>
);
