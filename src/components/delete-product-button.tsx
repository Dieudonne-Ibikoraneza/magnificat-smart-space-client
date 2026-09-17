"use client";

import { useState, type ReactElement } from "react";
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
  onDeleted,
  trigger,
}: {
  productId: string;
  productName: string;
  /** Navigated to after a successful delete — omit when the caller instead refreshes a list in place via `onDeleted`. */
  redirectTo?: string;
  /** Called after a successful delete (e.g. to reload a list) — runs before any `redirectTo` navigation. */
  onDeleted?: () => void;
  /** Custom trigger element (e.g. an icon-only button for list rows) — falls back to the default labeled button when omitted. */
  trigger?: ReactElement;
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
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
    } catch (cause) {
      toast.error(t("staff.deleteProduct.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.deleteProduct.toastTryAgain"),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      trigger={
        trigger ?? (
          <Button type="button" variant="destructive" disabled={deleting} className="h-12 w-full gap-2 text-sm font-semibold">
            <Trash2 className="size-4 stroke-2.5" />
            {deleting ? t("staff.deleteProduct.deleting") : t("staff.deleteProduct.delete")}
          </Button>
        )
      }
      title={t("staff.deleteProduct.confirmTitle", { name: productName })}
      description={t("staff.deleteProduct.confirmDescription")}
      confirmLabel={t("staff.deleteProduct.confirmLabel")}
      onConfirm={() => void handleDelete()}
    />
  );
};
