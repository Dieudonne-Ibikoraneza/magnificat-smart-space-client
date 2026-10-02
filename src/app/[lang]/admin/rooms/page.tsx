"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, Pencil } from "lucide-react";
import { DashboardPageHeader as AdminPageHeader } from "@/components/dashboard-page-headers";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { roomsApi } from "@/lib/api";
import { ApiError as ApiRequestError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { ApiRoom } from "@/lib/api/types";

export default function AdminRoomsPage() {
  const { t } = useTranslation();
  const { data: rooms, loading, error, reload } = useApi(() => roomsApi.listAdmin());
  const [uploadingRoomId, setUploadingRoomId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const chooseThumbnail = async (room: ApiRoom, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadingRoomId) return;
    setUploadingRoomId(room.id);
    setUploadProgress(0);
    try {
      const uploaded = await roomsApi.uploadThumbnail(file, setUploadProgress);
      await roomsApi.update(room.id, { thumbnail: uploaded.path });
      toast.success(t("admin.rooms.toastRoomUpdated"), {
        description: t("admin.rooms.toastRoomUpdatedDesc", { name: room.name }),
      });
      reload();
    } catch (cause) {
      toast.error(t("admin.rooms.toastUpdateFailed"), {
        description: cause instanceof ApiRequestError ? cause.message : t("admin.rooms.tryAgain"),
      });
    } finally {
      setUploadingRoomId(null);
    }
  };

  if (loading) {
    return <div className="pb-10"><AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")} /><ApiLoading label={t("admin.rooms.loadingRooms")} className="mt-10" /></div>;
  }
  if (error) {
    return <div className="pb-10"><AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")} /><ApiErrorState message={error} onRetry={reload} className="mt-10" /></div>;
  }

  return (
    <div className="pb-10">
      <AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(rooms ?? []).map((room) => (
          <article key={room.id} className="overflow-hidden rounded-2xl bg-card">
            <div className="group relative aspect-[16/10] overflow-hidden bg-muted-background">
              {room.thumbnail ? <Image src={room.thumbnail} alt={room.name} fill unoptimized className="object-cover transition-opacity duration-200 group-hover:opacity-50" sizes="(max-width: 768px) 100vw, 33vw" /> : <span className="flex h-full items-center justify-center text-muted-foreground transition-opacity duration-200 group-hover:opacity-50"><Box className="size-8" /></span>}
              {uploadingRoomId !== room.id && (
                <label className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center" aria-label={t("admin.rooms.changeThumbnail", { name: room.name })}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseThumbnail(room, event)} disabled={uploadingRoomId !== null} className="sr-only" />
                  <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-ink opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <Pencil className="size-4" />
                    <span>{t("admin.rooms.changeImage")}</span>
                  </span>
                </label>
              )}
              {uploadingRoomId === room.id && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 px-6" role="status" aria-live="polite">
                  <Progress value={uploadProgress} className="w-full max-w-[220px] flex-col gap-2">
                    <div className="flex w-full items-baseline gap-3">
                      <ProgressLabel className="text-ink">{t("admin.rooms.uploading")}</ProgressLabel>
                      <ProgressValue className="text-ink" />
                    </div>
                    <ProgressTrack className="w-full bg-black/10">
                      <ProgressIndicator className="bg-primary" />
                    </ProgressTrack>
                  </Progress>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <h2 className="min-w-0 truncate text-base font-bold text-ink">{room.name}</h2>
            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
