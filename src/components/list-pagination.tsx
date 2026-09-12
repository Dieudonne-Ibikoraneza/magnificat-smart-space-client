"use client";

import { useTranslation } from "react-i18next";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getVisiblePages } from "@/lib/catalog-utils";

/**
 * The "Showing X-Y of Z" + page-number footer every paginated list/table in
 * the app uses — one implementation (lifted from the tiles-analytics table,
 * the first place this pattern was built) so paging looks and behaves
 * identically everywhere instead of each page reinventing it. Renders
 * nothing once everything fits on one page.
 */
export const ListPagination = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const showingStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePages(page, totalPages);
  const goToPage = (next: number) => onPageChange(Math.min(Math.max(next, 1), totalPages));

  return (
    <footer className={`mt-6 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}>
      <p>
        {t("ui.showingRange", {
          start: showingStart,
          end: showingEnd,
          total: totalItems.toLocaleString(),
        })}
      </p>
      <Pagination className="mx-0 w-auto justify-start py-0 sm:justify-end">
        <PaginationContent className="gap-1 sm:gap-2">
          <PaginationItem>
            <PaginationLink
              href="#"
              size="sm"
              className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page === 1}
              onClick={(event) => {
                event.preventDefault();
                goToPage(1);
              }}
            >
              <ChevronsLeft className="size-4" />
              <span className="hidden sm:inline">{t("ui.first")}</span>
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page === 1}
              onClick={(event) => {
                event.preventDefault();
                goToPage(page - 1);
              }}
            />
          </PaginationItem>
          {visiblePages.map((p, index) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis className="text-muted" />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={page === p}
                  size="icon-sm"
                  className={
                    page === p
                      ? "border-ink bg-ink text-white hover:bg-ink hover:text-white"
                      : "text-ink hover:text-amber"
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page === totalPages}
              onClick={(event) => {
                event.preventDefault();
                goToPage(page + 1);
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href="#"
              size="sm"
              className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={page === totalPages}
              onClick={(event) => {
                event.preventDefault();
                goToPage(totalPages);
              }}
            >
              <span className="hidden sm:inline">{t("ui.last")}</span>
              <ChevronsRight className="size-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </footer>
  );
};
