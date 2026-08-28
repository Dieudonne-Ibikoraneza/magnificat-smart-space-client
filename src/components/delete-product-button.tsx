"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export const DeleteProductButton = ({
  productName,
  redirectTo,
}: {
  productName: string;
  redirectTo: string;
}) => {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="destructive" className="h-12 w-full gap-2 text-sm font-semibold">
          <Trash2 className="size-4 stroke-2.5" />
          Delete
        </Button>
      }
      title={`Delete ${productName}?`}
      description="This removes the product from inventory and the catalog. This can't be undone."
      confirmLabel="Delete product"
      onConfirm={() => {
        toast.success("Product deleted", { description: `${productName} was removed from inventory.` });
        router.push(redirectTo);
      }}
    />
  );
};
