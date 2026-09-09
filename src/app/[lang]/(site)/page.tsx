"use client";

import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductsPageSkeleton } from "@/components/skeletons";
import { productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

/**
 * The storefront catalog (doc 3.1/3.2). Fetches the active catalog once and
 * lets `ProductCatalog` handle filtering, search, sort and pagination
 * client-side — the same pattern `/collections/[id]` already uses. 100 covers
 * the current catalog comfortably; once it grows past one page, filtering
 * and search should move server-side (`productsApi.list` already accepts the
 * matching query params) instead of raising this limit further.
 */
const ProductsPage = () => {
  const { data, loading, error, reload } = useApi(() => productsApi.list({ limit: 100 }));
  const products = data?.items.map((product) => toProduct(product)) ?? [];

  if (loading) return <ProductsPageSkeleton />;
  if (error) return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  if (products.length === 0) {
    return <ApiEmptyState message="No products are available yet — check back soon." className="my-16" />;
  }

  return <ProductCatalog products={products} />;
};

export default ProductsPage;
