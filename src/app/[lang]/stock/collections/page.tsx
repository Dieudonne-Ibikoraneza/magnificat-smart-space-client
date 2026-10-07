"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Boxes,
  Search,
} from "lucide-react";
import { DashboardPageHeader as StockPageHeader } from "@/components/dashboard-page-headers";
import {
  ApiEmptyState,
  ApiErrorState,
  ApiLoading,
} from "@/components/api-state";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collectionsApi, productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { ApiCollection } from "@/lib/api/types";

type SortOption = "newest" | "oldest";

const StockCollectionCard = ({
  collection,
  productCount,
}: {
  collection: ApiCollection;
  productCount: number;
}) => {
  const { t } = useTranslation();

  return (
    <article className="group relative flex min-h-97.5 overflow-hidden rounded-3xl bg-ink shadow-sm transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(15,39,71,0.18)]">
      {collection.image && (
        <Image
          src={collection.image}
          alt={collection.title}
          fill
          unoptimized
          className="object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-transparent" />
      {!collection.isActive && (
        <span className="absolute top-4 right-4 z-10 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
          {t("stock.collections.inactive")}
        </span>
      )}

      <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
        <Boxes className="size-3.5" />
        {t("stock.collections.productCount", { count: productCount })}
      </span>

      <div className="relative z-10 mt-auto flex w-full translate-y-2 flex-col p-6 transition-transform duration-300 group-hover:translate-y-0 sm:p-7">
        <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">
          {collection.title}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/80">
          {collection.description}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/stock/collections/${collection.id}`} />}
            className="group/cta h-12 min-h-12 min-w-0 flex-1 gap-3 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
          >
            <span className="truncate">
              {t("stock.collections.viewCollection")}
            </span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-300 group-hover/cta:translate-x-1" />
          </Button>
        </div>
      </div>
    </article>
  );
};

export default function StockCollectionsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, reload } = useApi(
    () =>
      collectionsApi.list({
        catalogStatus: "all",
        page: currentPage,
        limit: 20,
        search: query.trim() || undefined,
        size: size === "all" ? undefined : size,
        sort,
      }),
    [currentPage, query, size, sort],
  );
  const { data: filterOptions } = useApi(() => productsApi.filterOptions());
  const collections = useMemo(() => data?.items ?? [], [data]);

  const sizeOptions = filterOptions?.sizes ?? [];

  return (
    <>
      <StockPageHeader
        title={t("stock.collections.title")}
        subtitle={
          loading
            ? t("stock.collections.loading")
            : t("stock.collections.managed", { count: data?.meta.total ?? 0 })
        }
      />

      <section className="mt-6 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:mt-8 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#71809a]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={t("stock.collections.searchPlaceholder")}
              aria-label={t("stock.collections.searchAria")}
              className="h-11 rounded-full bg-[#fafbfc] pl-11 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Select
              value={size}
              onValueChange={(value) => {
                setSize(value ?? "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 min-w-0 bg-card sm:w-32">
                <SelectValue>
                  {(value) =>
                    value === "all" ? t("stock.collections.sizeTrigger") : value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("stock.collections.sizeAll")}
                </SelectItem>
                {sizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort((value as SortOption) ?? "newest");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 min-w-0 gap-1.5 bg-card sm:w-44">
                <ArrowDownWideNarrow className="size-4 shrink-0 text-[#71809a]" />
                <SelectValue>
                  {(value) =>
                    value === "oldest"
                      ? t("stock.collections.sortOldest")
                      : t("stock.collections.sortNewest")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  {t("stock.collections.sortNewest")}
                </SelectItem>
                <SelectItem value="oldest">
                  {t("stock.collections.sortOldest")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="mt-6 sm:mt-8">
        {loading ? (
          <ApiLoading
            label={t("stock.collections.loadingList")}
            className="py-24"
          />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : collections.length === 0 ? (
          <ApiEmptyState
            message={t("stock.collections.empty")}
            className="py-16"
          />
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <StockCollectionCard
                key={collection.id}
                collection={collection}
                productCount={collection._count?.products ?? 0}
              />
            ))}
          </section>
        )}
        <ListPagination
          page={data?.meta.page ?? currentPage}
          totalPages={data?.meta.totalPages ?? 1}
          totalItems={data?.meta.total ?? 0}
          pageSize={20}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
}
