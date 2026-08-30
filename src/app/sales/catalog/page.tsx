"use client";

import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductsPageSkeleton } from "@/components/skeletons";
import { SalesPageHeader } from "@/app/sales/layout";
import { productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

/** Sales is view-only here — only admin/stock can create or edit a product (see ProductsController's @Roles), so there's no "Add New Product" action on this page. */
const CatalogPage = () => {
  const { data, loading, error, reload } = useApi(() => productsApi.list({ limit: 100 }));
  const products = data?.items.map((product) => toProduct(product)) ?? [];

  return (
    <>
      <SalesPageHeader
        title="Catalog"
        subtitle="Browse the sales catalog."
      />
      <div className="mt-6 sm:mt-8">
        {loading ? (
          <ProductsPageSkeleton />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : products.length === 0 ? (
          <ApiEmptyState message="No products are available yet." className="my-16" />
        ) : (
          <ProductCatalog products={products} showFavorites={false} detailsBasePath="/sales/catalog" />
        )}
      </div>
    </>
  );
};

export default CatalogPage;
