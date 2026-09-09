"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const CollectionNotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">{t("collections.notFound.title")}</h1>
      <p className="mt-3 max-w-md text-sm text-muted">{t("collections.notFound.body")}</p>
      <Button
        nativeButton={false}
        render={<Link href="/collections" />}
        className="mt-8 h-12 min-h-12 px-6 font-semibold text-ink bg-primary hover:bg-primary/90"
      >
        {t("collections.notFound.browse")}
      </Button>
    </div>
  );
};

export default CollectionNotFound;
