"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collections, type Collection } from "@/data/collections";
import { cn } from "@/lib/utils";

export const CollectionBreadcrumb = ({
  collection,
  className,
}: {
  collection: Collection;
  className?: string;
}) => {
  const router = useRouter();

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/collections" />}>
            Collections
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1 font-normal text-ink transition-colors hover:text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Switch collection, currently ${collection.title}`}
              aria-current="page"
            >
              {collection.title}
              <ChevronDown
                className="size-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-56 rounded-2xl border-slate-200 bg-white p-2 shadow-[0_14px_32px_rgba(15,39,71,0.16)]"
            >
              {collections.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-ink focus:bg-primary/20",
                    item.id === collection.id && "bg-primary/15 font-semibold",
                  )}
                  onClick={() => router.push(`/collections/${item.id}`)}
                >
                  {item.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
