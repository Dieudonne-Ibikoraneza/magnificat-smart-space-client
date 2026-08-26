"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ProductCatalog } from "@/components/product-catalog";
import { SalesPageHeader } from "@/app/sales/layout";
import { Button } from "@/components/ui/button";
import { products } from "@/data/catalog";

const CatalogPage = () => {
  const router = useRouter();

  return (
    <>
      <SalesPageHeader
        title="Catalog"
        subtitle="Browse and manage the sales catalog."
      >
        <Button
          type="button"
          onClick={() => router.push("/sales/catalog/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add New Product
        </Button>
      </SalesPageHeader>
      <div className="mt-6 sm:mt-8">
        <ProductCatalog products={products} showFavorites={false} detailsBasePath="/sales/catalog" />
      </div>
    </>
  );
};

export default CatalogPage;
