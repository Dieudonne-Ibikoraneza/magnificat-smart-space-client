"use client";

import { PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type InventoryEmptyStateProps = {
  searchTerm: string;
  hasFilters: boolean;
  onClearSearch: () => void;
  onResetFilters: () => void;
};

export const InventoryEmptyState = ({
  searchTerm,
  hasFilters,
  onClearSearch,
  onResetFilters,
}: InventoryEmptyStateProps) => {
  const { t } = useTranslation();
  const mode = searchTerm.trim() ? "search" : hasFilters ? "filters" : "empty";

  const title =
    mode === "search"
      ? t("catalog.empty.noSearchTitle", { term: searchTerm.trim() })
      : mode === "filters"
        ? t("catalog.empty.noMatchTitle")
        : t("stock.inventory.noProductsTitle");
  const description =
    mode === "search"
      ? t("catalog.empty.noSearchBody")
      : mode === "filters"
        ? t("catalog.empty.noMatchBody")
        : t("catalog.noProducts");

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted-background text-muted">
        <PackageOpen className="size-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {mode === "search" && (
        <Button
          type="button"
          className="mt-6 h-11 px-6 bg-primary font-semibold text-ink hover:bg-primary/90"
          onClick={onClearSearch}
        >
          {t("catalog.empty.clearSearch")}
        </Button>
      )}
      {mode === "filters" && (
        <Button
          type="button"
          className="mt-6 h-11 px-6 bg-primary font-semibold text-ink hover:bg-primary/90"
          onClick={onResetFilters}
        >
          {t("catalog.resetFilters")}
        </Button>
      )}
    </div>
  );
};
