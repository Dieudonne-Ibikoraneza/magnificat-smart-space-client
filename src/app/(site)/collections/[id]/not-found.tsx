import Link from "next/link";
import { Button } from "@/components/ui/button";

const CollectionNotFound = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <h1 className="text-2xl font-bold text-ink">Collection not found</h1>
    <p className="mt-3 max-w-md text-sm text-muted">
      The collection you are looking for does not exist or may have been moved.
    </p>
    <Button
      nativeButton={false}
      render={<Link href="/collections" />}
      className="mt-8 h-12 min-h-12 px-6 font-semibold text-ink bg-primary hover:bg-primary/90"
    >
      Browse Collections
    </Button>
  </div>
);

export default CollectionNotFound;
