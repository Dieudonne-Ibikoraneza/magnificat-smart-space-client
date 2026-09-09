import Link from "next/link";
import { Button } from "@/components/ui/button";

const ProductNotFound = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <h1 className="text-2xl font-bold text-ink">Product not found</h1>
    <p className="mt-3 max-w-md text-sm text-muted">
      The tile you are looking for does not exist or may have been removed.
    </p>
    <Button
      nativeButton={false}
      render={<Link href="/" />}
      className="mt-8 h-12 min-h-12 px-6 font-semibold text-ink bg-primary hover:bg-primary/90"
    >
      Browse Products
    </Button>
  </div>
);

export default ProductNotFound;
