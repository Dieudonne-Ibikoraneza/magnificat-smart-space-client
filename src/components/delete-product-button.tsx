"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.remove(productId);
      toast.success(t("staff.deleteProduct.toastDeletedTitle"), {
        description: t("staff.deleteProduct.toastDeletedBody", { name: productName }),
      });
      router.push(redirectTo);
    } catch (cause) {
      toast.error(t("staff.deleteProduct.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.deleteProduct.toastTryAgain"),
      });
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="destructive" disabled={deleting} className="h-12 w-full gap-2 text-sm font-semibold">
          <Trash2 className="size-4 stroke-2.5" />
          {deleting ? t("staff.deleteProduct.deleting") : t("staff.deleteProduct.delete")}
        </Button>
      }
      title={t("staff.deleteProduct.confirmTitle", { name: productName })}
      description={t("staff.deleteProduct.confirmDescription")}
      confirmLabel={t("staff.deleteProduct.confirmLabel")}
      onConfirm={() => void handleDelete()}
    />
  );
};
