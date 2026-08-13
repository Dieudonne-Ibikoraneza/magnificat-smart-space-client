"use client";

import { use, useMemo } from "react";
import { notFound } from "next/navigation";
import { CollectionBreadcrumb } from "@/components/collection-breadcrumb";
import { ProductCatalog } from "@/components/product-catalog";
import { getProductsByCollection } from "@/data/catalog";
import { getCollectionById } from "@/data/collections";

const CollectionDetailsPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = use(params);
  const collection = getCollectionById(id);

  const collectionProducts = useMemo(
    () => getProductsByCollection(id),
    [id],
  );

  if (!collection) {
    notFound();
  }

  return (
    <ProductCatalog
      breadcrumb={<CollectionBreadcrumb collection={collection} />}
      products={collectionProducts}
    />
  );
};

export default CollectionDetailsPage;
