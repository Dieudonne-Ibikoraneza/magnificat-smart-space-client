"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

export const DeleteProductButton = ({
  productId,
  productName,
  redirectTo,
}: {
  productId: string;
  productName: string;
  redirectTo: string;
}) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.remove(productId);
      toast.success("Product deleted", { description: `${productName} was removed from inventory.` });
      router.push(redirectTo);
    } catch (cause) {
      toast.error("Couldn't delete product", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="destructive" disabled={deleting} className="h-12 w-full gap-2 text-sm font-semibold">
          <Trash2 className="size-4 stroke-2.5" />
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      }
      title={`Delete ${productName}?`}
      description="This removes the product from inventory and the catalog. This can't be undone."
      confirmLabel="Delete product"
      onConfirm={() => void handleDelete()}
    />
  );
};
