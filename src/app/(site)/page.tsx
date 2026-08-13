"use client";

import { ProductCatalog } from "@/components/product-catalog";
import { products } from "@/data/catalog";

const ProductsPage = () => <ProductCatalog products={products} />;

export default ProductsPage;
