"use client";

import { use, useMemo } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/collections" />}>Collections</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{collection.title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      products={collectionProducts}
    />
  );
};

export default CollectionDetailsPage;
