"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ApiErrorState } from "@/components/api-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductsPageSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffCollectionToolbar } from "@/components/staff-toolbar";
import { collectionsApi, productsApi, toProduct } from "@/lib/api";
import { localizedText } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import { useLocale } from "@/lib/i18n";
import CollectionNotFound from "./not-found";

/**
 * Collection detail: the collection itself plus every product in it, both from
 * the API. The two calls run together because the catalog needs the collection
 * title to label each card.
 */
const CollectionDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useCurrentUser();
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "low" | "high">("newest");

  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([collectionsApi.get(id), productsApi.list({ collectionId: id, page, limit: 20, search: search || undefined, sort: sort === "low" ? "price_asc" : sort === "high" ? "price_desc" : "newest" })]),
    [id, page, search, sort],
    { keepPreviousData: true },
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <ProductsPageSkeleton />
      </div>
    );
  }

  if (error) {
    // A deleted or mistyped collection id is a 404, not a failure worth retrying.
    if (error.toLowerCase().includes("not found")) return <CollectionNotFound />;
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  const [collection, products] = data ?? [];
  if (!collection) return <CollectionNotFound />;
  const collectionTitle = localizedText(collection.title, collection.titleRw, locale);

  const isClient = user?.role === "CLIENT";

  return (
    <>
      {user && !isClient && <StaffCollectionToolbar role={user.role} collectionId={collection.id} />}
      <ProductCatalog
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/collections" />}>{t("collections.breadcrumb")}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{collectionTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        products={(products?.items ?? []).map((product) => toProduct(product, collectionTitle, locale))}
        showFavorites={isClient}
        showAddToCart={isClient}
        serverPagination={{ page: products?.meta.page ?? page, totalPages: products?.meta.totalPages ?? 1, totalItems: products?.meta.total ?? 0, pageSize: 20, onPageChange: setPage, onSearchChange: (value) => { setSearch(value); setPage(1); }, onSortChange: (value) => { setSort(value); setPage(1); } }}
      />
    </>
  );
};

export default CollectionDetailsPage;
