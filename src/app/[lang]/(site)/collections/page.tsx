"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { CollectionGridSkeleton, CollectionsBannerSkeleton } from "@/components/skeletons";
import { StaffCatalogActions } from "@/components/staff-toolbar";
import { Button } from "@/components/ui/button";
import { collectionsApi, toCollection } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import { useLocale } from "@/lib/i18n";
import type { Collection } from "@/data/collections";

const CollectionCard = ({ collection }: { collection: Collection }) => {
  const { t } = useTranslation();

  return (
    <article className="group relative flex min-h-[390px] overflow-hidden rounded-3xl bg-ink shadow-sm transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(15,39,71,0.18)]">
      {collection.image && (
        <Image
          src={collection.image}
          alt={t("collections.cardImageAlt", { title: collection.title })}
          fill
          unoptimized
          className="object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
      <div className="relative z-10 mt-auto flex w-full translate-y-2 flex-col p-6 transition-transform duration-300 group-hover:translate-y-0 sm:p-7">
        <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">{collection.title}</h2>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/80">{collection.description}</p>
        <Button
          nativeButton={false}
          render={<Link href={`/collections/${collection.id}`} />}
          className="group/cta mt-6 h-11 w-fit gap-3 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          {t("collections.viewCollection")}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
        </Button>
      </div>
    </article>
  );
};

/** Collections come from `GET /collections` — see `src/lib/api/endpoints.ts`. */
const CollectionsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useCurrentUser();
  const { data, loading, error, reload } = useApi(() => collectionsApi.list({ limit: 50 }));
  const collections = data?.items.map((collection) => toCollection(collection, locale)) ?? [];

  return (
    <div className="space-y-12 pb-12">
      {user && user.role !== "CLIENT" && <StaffCatalogActions role={user.role} kind="collection" />}
      {loading ? (
        <CollectionsBannerSkeleton />
      ) : (
        <section className="relative overflow-hidden rounded-3xl bg-ink px-7 py-12 text-white shadow-sm sm:px-12 sm:py-16 lg:px-20 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
              {t("collections.badge")}
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              <Trans
                i18nKey="collections.title"
                components={{ accent: <span className="text-amber" /> }}
              />
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              {t("collections.intro")}
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className="mt-8 h-14 min-h-14 px-8 py-3 font-bold text-ink bg-primary hover:bg-primary/90"
            >
              {t("collections.exploreAll")}
            </Button>
          </div>
          <div className="relative mt-10 aspect-square overflow-hidden rounded-3xl sm:absolute sm:right-10 sm:top-1/2 sm:mt-0 sm:w-[31%] sm:-translate-y-1/2 lg:right-20 lg:w-[28%]">
            <Image src="/tile-marble.jpg" alt={t("collections.bannerImageAlt")} fill className="object-cover" sizes="(max-width: 640px) 100vw, 30vw" />
          </div>
        </section>
      )}

      {loading && <CollectionGridSkeleton count={6} />}
      {!loading && error && <ApiErrorState message={error} onRetry={reload} />}
      {!loading && !error && collections.length === 0 && (
        <ApiEmptyState message={t("collections.empty")} />
      )}
      {!loading && !error && collections.length > 0 && (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </section>
      )}
    </div>
  );
};

export default CollectionsPage;
