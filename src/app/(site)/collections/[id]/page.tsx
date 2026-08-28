"use client";

import { use } from "react";
import Link from "next/link";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProductCatalog } from "@/components/product-catalog";
import { collectionsApi, productsApi, toProduct } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import CollectionNotFound from "./not-found";

/**
 * Collection detail: the collection itself plus every product in it, both from
 * the API. The two calls run together because the catalog needs the collection
 * title to label each card.
 */
const CollectionDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);

  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([collectionsApi.get(id), productsApi.list({ collectionId: id, limit: 100 })]),
    [id],
  );

  if (loading) return <ApiLoading label="Loading collection…" className="py-32" />;

  if (error) {
    // A deleted or mistyped collection id is a 404, not a failure worth retrying.
    if (error.toLowerCase().includes("not found")) return <CollectionNotFound />;
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  const [collection, products] = data ?? [];
  if (!collection) return <CollectionNotFound />;

  return (
    <ProductCatalog
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/collections" />}>Collections</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{collection.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      products={(products?.items ?? []).map((product) => toProduct(product, collection.title))}
    />
  );
};

export default CollectionDetailsPage;
