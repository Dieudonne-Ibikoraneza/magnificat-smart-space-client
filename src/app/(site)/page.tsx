"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filterGroups, products } from "@/data/catalog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const FilterGroup = ({
  title,
  options,
}: {
  title: string;
  options: string[];
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink"
      >
        {title}
        <ChevronDown
          className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2.5 pt-3">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 text-sm text-ink"
              >
                <span className="flex size-5 items-center justify-center rounded border border-slate-200 has-[:checked]:border-primary has-[:checked]:bg-primary">
                  <Input type="checkbox" className="peer sr-only" />
                  <Check className="hidden size-3.5 peer-checked:block" />
                </span>
                {option}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterPanel = ({ onClose }: { onClose?: () => void }) => (
  <>
    <section
      className={
        onClose ? "bg-transparent p-0" : "rounded-2xl bg-white p-6 shadow-sm"
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Filters</h1>
        <Button variant="link" className="h-auto p-0 text-sm text-amber">
          Reset
        </Button>
      </div>
      {filterGroups.map((group) => (
        <FilterGroup key={group.title} {...group} />
      ))}
    </section>
    {onClose && (
      <Button
        type="button"
        variant="link"
        className="h-auto w-full justify-center p-0 text-sm text-amber lg:hidden"
        onClick={onClose}
      >
        Close filters
      </Button>
    )}
    <section className="rounded-2xl bg-ink p-6 text-center text-white shadow-sm">
      <h2 className="mb-2 text-lg font-bold">Need Expert Help</h2>
      <p className="mb-5 text-sm leading-5 text-white/75">
        Chat with our AI interior designer to find the perfect match.
      </p>
      <Button className="w-full bg-primary font-semibold text-ink hover:bg-primary/90">
        Ask AI Assistant
      </Button>
    </section>
  </>
);

const ProductsPage = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersClosing, setFiltersClosing] = useState(false);

  const openFilters = () => {
    setFiltersClosing(false);
    setFiltersOpen(true);
  };

  const closeFilters = () => {
    setFiltersClosing(true);
    window.setTimeout(() => {
      setFiltersOpen(false);
      setFiltersClosing(false);
    }, 300);
  };
  return (
    <>
      {filtersOpen && (
        <div
          className={`fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm lg:hidden ${filtersClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"}`}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeFilters();
          }}
        >
          <div className={`scrollbar-hide absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-background px-5 shadow-2xl duration-300 ${filtersClosing ? "animate-out slide-out-to-bottom-full fade-out" : "animate-in slide-in-from-bottom-full fade-in"}`}>
            <div className="sticky top-0 z-10 -mx-5 mb-4 flex h-8 items-start justify-center bg-background pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <div className="space-y-6 pb-8">
              <FilterPanel onClose={closeFilters} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="scrollbar-hide hidden w-72 shrink-0 space-y-6 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <FilterPanel />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="relative mb-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-white px-5 py-3 shadow-sm sm:flex-row sm:items-center lg:static">
            <Button
              type="button"
              size="icon-lg"
              className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-primary text-ink shadow-lg hover:bg-primary/90 sm:hidden"
              onClick={openFilters}
              aria-label="Open filters"
            >
              <SlidersHorizontal className="size-6" />
            </Button>
            <p className="text-sm text-muted">
              Showing <strong className="text-ink">1-49</strong> of{" "}
              <strong className="text-ink">450</strong> results
            </p>
            <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Sort by:</span>
                <Select defaultValue="newest">
                  <SelectTrigger className="h-9 w-40 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold hover:bg-muted-background data-[state=open]:border-border data-[state=open]:bg-white">
                    <SelectValue>
                      {(value) =>
                        ({
                          newest: "Newest Arrivals",
                          low: "Price: Low to High",
                          high: "Price: High to Low",
                        })[value as string] ?? "Newest Arrivals"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-48 rounded-2xl border-slate-200 bg-white p-2 shadow-[0_14px_32px_rgba(15,39,71,0.16)] [&_[data-slot=select-item]]:mb-1">
                    <SelectItem
                      value="newest"
                      className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
                    >
                      Newest Arrivals
                    </SelectItem>
                    <SelectItem
                      value="low"
                      className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
                    >
                      Price: Low to High
                    </SelectItem>
                    <SelectItem
                      value="high"
                      className="rounded-xl py-3 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20"
                    >
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex rounded-lg bg-muted-background p-1">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setViewMode("grid")}
                  className={
                    viewMode === "grid"
                      ? "bg-white text-ink shadow-sm"
                      : "text-muted"
                  }
                  aria-label="Grid view"
                >
                  <LayoutGrid />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setViewMode("list")}
                  className={
                    viewMode === "list"
                      ? "bg-white text-ink shadow-sm"
                      : "text-muted"
                  }
                  aria-label="List view"
                >
                  <List />
                </Button>
              </div>
            </div>
          </div>
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "grid gap-4"
            }
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                list={viewMode === "list"}
              />
            ))}
          </div>
          <Pagination className="py-10">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  size="sm"
                  className="gap-1 text-ink hover:text-amber"
                >
                  <ChevronsLeft className="size-4" />
                  <span className="hidden sm:inline">First</span>
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className="text-ink hover:text-amber"
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive
                  size="icon-sm"
                  className="border-ink bg-ink text-white hover:bg-ink hover:text-white"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {[2, 3, 4].map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    size="icon-sm"
                    className="hidden text-ink hover:text-amber sm:inline-flex"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className="text-ink hover:text-amber"
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  size="sm"
                  className="gap-1 text-ink hover:text-amber"
                >
                  <span className="hidden sm:inline">Last</span>
                  <ChevronsRight className="size-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
    </>
  );
};

export default ProductsPage;
