"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductsPageSkeleton } from "@/components/skeletons";
import { DashboardPageHeader as SalesPageHeader } from "@/components/dashboard-page-headers";
import { productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useLocale } from "@/lib/i18n";

/** Sales is view-only here — only admin/stock can create or edit a product (see ProductsController's @Roles), so there's no "Add New Product" action on this page. */
const CatalogPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "low" | "high">("newest");
  const { data, loading, error, reload } = useApi(
    () => productsApi.list({ page, limit: 20, search: search || undefined, sort: sort === "low" ? "price_asc" : sort === "high" ? "price_desc" : "newest" }),
    [page, search, sort],
    { keepPreviousData: true },
  );
  const products = data?.items.map((product) => toProduct(product, undefined, locale)) ?? [];

  return (
    <>
      <SalesPageHeader
        title={t("sales.catalog.title")}
        subtitle={t("sales.catalog.subtitle")}
      />
      <div className="mt-6 sm:mt-8">
        {loading ? (
          <ProductsPageSkeleton />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : products.length === 0 && !search && (data?.meta.total ?? 0) === 0 ? (
          <ApiEmptyState message={t("sales.catalog.empty")} className="my-16" />
        ) : (
          <ProductCatalog
            products={products}
            showFavorites={false}
            showAddToCart={false}
            detailsBasePath="/sales/catalog"
            serverPagination={{ page: data?.meta.page ?? page, totalPages: data?.meta.totalPages ?? 1, totalItems: data?.meta.total ?? 0, pageSize: 20, onPageChange: setPage, onSearchChange: (value) => { setSearch(value); setPage(1); }, onSortChange: (value) => { setSort(value); setPage(1); } }}
          />
        )}
      </div>
    </>
  );
};

export default CatalogPage;
