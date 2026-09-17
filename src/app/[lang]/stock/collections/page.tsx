"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, ArrowRight, Boxes, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { StockPageHeader } from "@/app/[lang]/stock/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { collectionsApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { ApiCollection } from "@/lib/api/types";

type SortOption = "newest" | "oldest";

const StockCollectionCard = ({
  collection,
  productCount,
  onDeleted,
}: {
  collection: ApiCollection;
  productCount: number;
  onDeleted: () => void;
}) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await collectionsApi.remove(collection.id);
      toast.success(t("stock.collections.toastDeletedTitle"), {
        description: t("stock.collections.toastDeletedBody", { name: collection.title }),
      });
      onDeleted();
    } catch (cause) {
      toast.error(t("stock.collections.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("stock.collections.toastTryAgain"),
      });
    } finally {
      setDeleting(false);
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

      <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
        <Boxes className="size-3.5" />
        {t("stock.collections.productCount", { count: productCount })}
      </span>

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
            render={<Link href={`/stock/collections/${collection.id}`} />}
            className="group/cta h-12 min-h-12 min-w-0 flex-1 gap-3 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
          >
            <span className="truncate">{t("stock.collections.viewCollection")}</span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-300 group-hover/cta:translate-x-1" />
          </Button>

          <div className="flex h-12 min-h-12 shrink-0 items-center overflow-hidden rounded-full bg-primary shadow-sm">
            <Button
              type="button"
              nativeButton={false}
              render={<Link href={`/stock/collections/${collection.id}`} />}
              variant="ghost"
              size="icon-sm"
              className="h-12 w-10 rounded-none text-ink hover:bg-white/45"
              aria-label={t("stock.collections.editAria", { title: collection.title })}
            >
              <Pencil className="size-4" strokeWidth={2.25} />
            </Button>
            <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={deleting}
                  className="h-12 w-10 rounded-none text-ink hover:bg-white/45 hover:text-red-600"
                  aria-label={t("stock.collections.deleteAria", { title: collection.title })}
                >
                  <Trash2 className="size-4" strokeWidth={2.25} />
                </Button>
              }
              title={t("stock.collections.confirmDeleteTitle", { title: collection.title })}
              description={t("stock.collections.confirmDeleteDescription")}
              confirmLabel={t("stock.collections.confirmDeleteLabel")}
              onConfirm={() => void handleDelete()}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

export default function StockCollectionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const { data, loading, error, reload } = useApi(() => collectionsApi.list({ limit: 100 }));
  const { data: productsData, reload: reloadProducts } = useApi(() => productsApi.list({ limit: 100 }));
  const collections = useMemo(() => data?.items ?? [], [data]);
  const products = useMemo(() => productsData?.items ?? [], [productsData]);

  const productCountByCollection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.collectionId, (counts.get(product.collectionId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const sizeOptions = useMemo(
    () => Array.from(new Set(collections.map((collection) => collection.size))).sort(),
    [collections],
  );

  const results = useMemo(
    () =>
      collections
        .filter((collection) => {
          const term = query.trim().toLowerCase();
          const matchesQuery = term === "" || collection.title.toLowerCase().includes(term);
          const matchesSize = size === "all" || collection.size === size;
          return matchesQuery && matchesSize;
        })
        .sort((a, b) => {
          const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return sort === "newest" ? -diff : diff;
        }),
    [collections, query, size, sort],
  );

  const handleReload = () => {
    reload();
    reloadProducts();
  };

  return (
    <>
      <StockPageHeader
        title={t("stock.collections.title")}
        subtitle={loading ? t("stock.collections.loading") : t("stock.collections.managed", { count: collections.length })}
      >
        <Button
          type="button"
          onClick={() => router.push("/stock/collections/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t("stock.collections.addNew")}
        </Button>
      </StockPageHeader>

      <section className="mt-6 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:mt-8 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#71809a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("stock.collections.searchPlaceholder")}
              aria-label={t("stock.collections.searchAria")}
              className="h-11 rounded-full bg-[#fafbfc] pl-11 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Select value={size} onValueChange={(value) => setSize(value ?? "all")}>
              <SelectTrigger className="h-11 min-w-0 bg-card sm:w-32">
                <SelectValue>{(value) => (value === "all" ? t("stock.collections.sizeTrigger") : value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.collections.sizeAll")}</SelectItem>
                {sizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort((value as SortOption) ?? "newest")}>
              <SelectTrigger className="h-11 min-w-0 gap-1.5 bg-card sm:w-44">
                <ArrowDownWideNarrow className="size-4 shrink-0 text-[#71809a]" />
                <SelectValue>
                  {(value) => (value === "oldest" ? t("stock.collections.sortOldest") : t("stock.collections.sortNewest"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("stock.collections.sortNewest")}</SelectItem>
                <SelectItem value="oldest">{t("stock.collections.sortOldest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="mt-6 sm:mt-8">
        {loading ? (
          <ApiLoading label={t("stock.collections.loadingList")} className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : results.length === 0 ? (
          <ApiEmptyState message={t("stock.collections.empty")} className="py-16" />
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((collection) => (
              <StockCollectionCard
                key={collection.id}
                collection={collection}
                productCount={productCountByCollection.get(collection.id) ?? 0}
                onDeleted={handleReload}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
