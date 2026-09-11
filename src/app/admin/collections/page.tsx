"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { collectionsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { ApiCollection } from "@/lib/api/types";

const AdminCollectionCard = ({
  collection,
  onDeleted,
}: {
  collection: ApiCollection;
  onDeleted: () => void;
}) => {
  const { t } = useTranslation();
  const handleDelete = async () => {
    if (!window.confirm(t("stock.collections.confirmDelete", { title: collection.title }))) return;
    try {
      await collectionsApi.remove(collection.id);
      toast.success(t("stock.collections.toastDeletedTitle"), { description: t("stock.collections.toastDeletedBody", { name: collection.title }) });
      onDeleted();
    } catch (cause) {
      toast.error(t("stock.collections.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("stock.collections.toastTryAgain"),
      });
    }
  };

  return (
    <article className="group relative flex min-h-97.5 overflow-hidden rounded-3xl bg-ink shadow-sm transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(15,39,71,0.18)]">
      {collection.image && (
        <Image
          src={collection.image}
          alt={collection.title}
          fill
          unoptimized
          className="object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-transparent" />
      <div className="relative z-10 mt-auto flex w-full translate-y-2 flex-col p-6 transition-transform duration-300 group-hover:translate-y-0 sm:p-7">
        <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">
          {collection.title}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/80">
          {collection.description}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/admin/collections/${collection.id}`} />}
            className="group/cta h-12 min-h-12 min-w-0 flex-1 gap-3 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
          >
            <span className="truncate">{t("stock.collections.viewCollection")}</span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-300 group-hover/cta:translate-x-1" />
          </Button>

          <div className="flex h-12 min-h-12 shrink-0 items-center overflow-hidden rounded-full bg-primary shadow-sm">
            <Button
              type="button"
              nativeButton={false}
              render={<Link href={`/admin/collections/${collection.id}`} />}
              variant="ghost"
              size="icon-sm"
              className="h-12 w-10 rounded-none text-ink hover:bg-white/45"
              aria-label={t("stock.collections.editAria", { title: collection.title })}
            >
              <Pencil className="size-4" strokeWidth={2.25} />
            </Button>
            <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleDelete()}
              className="h-12 w-10 rounded-none text-ink hover:bg-white/45 hover:text-red-600"
              aria-label={t("stock.collections.deleteAria", { title: collection.title })}
            >
              <Trash2 className="size-4" strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default function AdminCollectionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading, error, reload } = useApi(() => collectionsApi.list({ limit: 100 }));
  const collections = data?.items ?? [];

  return (
    <>
      <AdminPageHeader
        title={t("stock.collections.title")}
        subtitle={loading ? t("stock.collections.loading") : t("stock.collections.managed", { count: collections.length })}
      >
        <Button
          type="button"
          onClick={() => router.push("/admin/collections/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t("stock.collections.addNew")}
        </Button>
      </AdminPageHeader>

      <div className="mt-6 sm:mt-8">
        {loading ? (
          <ApiLoading label={t("stock.collections.loadingList")} className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : collections.length === 0 ? (
          <ApiEmptyState message={t("stock.collections.empty")} className="py-16" />
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <AdminCollectionCard key={collection.id} collection={collection} onDeleted={reload} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
