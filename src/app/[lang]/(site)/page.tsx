"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductsPageSkeleton } from "@/components/skeletons";
import { StaffCatalogActions } from "@/components/staff-toolbar";
import { productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import { useLocale } from "@/lib/i18n";
import { catalogFilterQuery, EMPTY_FILTERS, type CatalogFilters } from "@/lib/catalog-utils";

const ProductsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useCurrentUser();
  const isClient = user?.role === "CLIENT";
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<"newest" | "low" | "high">("newest");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(initialSearch);
  if (initialSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(initialSearch);
    setSearch(initialSearch);
    setPage(1);
  }
  const { data, loading, refreshing, error, reload } = useApi(
    () =>
      productsApi.list({
        page,
        limit: 20,
        search: search.trim() || undefined,
        ...catalogFilterQuery(filters),
        sort:
          sort === "low"
            ? "price_asc"
            : sort === "high"
              ? "price_desc"
              : "newest",
      }),
    [page, search, sort, filters],
    { keepPreviousData: true },
  );
  const products =
    data?.items.map((product) => toProduct(product, undefined, locale)) ?? [];
  const { data: filterOptions } = useApi(() => productsApi.filterOptions());
  const sizeOptions = filterOptions?.sizes;

  if (loading) return <ProductsPageSkeleton />;
  if (error)
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  if (
    !refreshing &&
    products.length === 0 &&
    !search &&
    (data?.meta.total ?? 0) === 0
  ) {
    return (
      <ApiEmptyState message={t("catalog.noProducts")} className="my-16" />
    );
  }

  return (
    <>
      {user && !isClient && <StaffCatalogActions role={user.role} />}
      <ProductCatalog
        products={products}
        sizeOptions={sizeOptions}
        showFavorites={isClient}
        showAddToCart={isClient}
        initialSearch={initialSearch}
        isRefreshing={refreshing}
        serverPagination={{
          page: data?.meta.page ?? page,
          totalPages: data?.meta.totalPages ?? 1,
          totalItems: data?.meta.total ?? 0,
          pageSize: 20,
          onPageChange: setPage,
          onSearchChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          onSortChange: (value) => {
            setSort(value);
            setPage(1);
          },
          onFiltersChange: (value) => {
            setFilters(value);
            setPage(1);
          },
        }}
      />
    </>
  );
};

export default ProductsPage;
