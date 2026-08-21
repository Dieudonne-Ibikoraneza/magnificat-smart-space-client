import { ProductCatalog } from "@/components/product-catalog";
import { SalesPageHeader } from "@/app/sales/layout";
import { products } from "@/data/catalog";

const CatalogPage = () => (
  <>
    <SalesPageHeader
      title="Catalog"
      subtitle="Browse and manage the sales catalog."
    />
    <div className="mt-6 sm:mt-8">
      <ProductCatalog products={products} showFavorites={false} detailsBasePath="/sales/catalog" />
    </div>
  </>
);

export default CatalogPage;
