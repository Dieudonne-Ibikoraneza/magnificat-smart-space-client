"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, Boxes, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/app/[lang]/admin/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { roomsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { roomTypeLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import type { ApiRoom, RoomType } from "@/lib/api/types";

const roomTypes = Object.keys(roomTypeLabels) as RoomType[];
const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

type RoomDraft = { type: RoomType; name: string; description: string; thumbnail: string; modelUrl: string };

const emptyDraft: RoomDraft = {
  type: "LIVING_ROOM",
  name: "",
  description: "",
  thumbnail: "",
  modelUrl: "",
};

/**
 * Content management for the 3D rooms the visualizer offers (doc 3.10).
 * Publishing a room is what makes it selectable in the customer-facing
 * visualizer, so retiring one is a visibility toggle rather than a delete —
 * a hard delete is only even allowed once no saved customer design still
 * references it (enforced server-side, not just by this page's own copy).
 */
export default function AdminRoomsPage() {
  const { t } = useTranslation();
  const { data: rooms, loading, error, reload } = useApi(() => roomsApi.listAdmin());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ApiRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = rooms ?? [];
    if (!term) return items;
    return items.filter(
      (room) =>
        room.name.toLowerCase().includes(term) ||
        roomTypeLabels[room.type].toLowerCase().includes(term),
    );
  }, [rooms, search]);

  const openCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (room: ApiRoom) => {
    setDraft({
      type: room.type,
      name: room.name,
      description: room.description ?? "",
      thumbnail: room.thumbnail ?? "",
      modelUrl: room.modelUrl,
    });
    setEditing(room);
    setCreating(false);
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
  };

  const valid = draft.name.trim() !== "" && draft.modelUrl.trim() !== "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const body = {
        type: draft.type,
        name: draft.name.trim(),
        modelUrl: draft.modelUrl.trim(),
        description: draft.description.trim() || undefined,
        thumbnail: draft.thumbnail.trim() || undefined,
      };
      if (editing) {
        await roomsApi.update(editing.id, body);
        toast.success(t("admin.rooms.toastRoomUpdated"), { description: t("admin.rooms.toastRoomUpdatedDesc", { name: draft.name }) });
      } else {
        await roomsApi.create(body);
        toast.success(t("admin.rooms.toastRoomAdded"), { description: t("admin.rooms.toastRoomAddedDesc", { name: draft.name }) });
      }
      closeDialog();
      reload();
    } catch (cause) {
      toast.error(editing ? t("admin.rooms.toastUpdateFailed") : t("admin.rooms.toastAddFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.rooms.tryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (room: ApiRoom) => {
    const nextActive = !room.isActive;
    try {
      await roomsApi.update(room.id, { isActive: nextActive });
      toast.success(nextActive ? t("admin.rooms.toastRoomPublished") : t("admin.rooms.toastRoomHidden"), {
        description: nextActive
          ? t("admin.rooms.toastRoomPublishedDesc")
          : t("admin.rooms.toastRoomHiddenDesc"),
      });
      reload();
    } catch (cause) {
      toast.error(t("admin.rooms.toastVisibilityFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.rooms.tryAgain"),
      });
    }
  };

  const remove = async (room: ApiRoom) => {
    try {
      await roomsApi.remove(room.id);
      toast.success(t("admin.rooms.toastRoomDeleted"));
      reload();
    } catch (cause) {
      toast.error(t("admin.rooms.toastDeleteFailed"), {
        description: cause instanceof ApiError ? cause.message : t("admin.rooms.tryAgain"),
      });
    }
  };

  if (loading) {
    return (
      <div className="pb-10">
        <AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")} />
        <ApiLoading label={t("admin.rooms.loadingRooms")} className="mt-10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-10">
        <AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")} />
        <ApiErrorState message={error} onRetry={reload} className="mt-10" />
      </div>
    );
  }

  const roomList = rooms ?? [];

  return (
    <div className="pb-10">
      <AdminPageHeader title={t("admin.rooms.title")} subtitle={t("admin.rooms.subtitle")}>
        <Button type="button" onClick={openCreate} className="h-11 shrink-0 gap-2 font-bold">
          <Plus className="size-4" /> {t("admin.rooms.addRoom")}
        </Button>
      </AdminPageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { key: "total", label: t("admin.rooms.statTotalRooms"), value: roomList.length, icon: Boxes },
          { key: "published", label: t("admin.rooms.statPublished"), value: roomList.filter((room) => room.isActive).length, icon: Eye },
          { key: "hidden", label: t("admin.rooms.statHidden"), value: roomList.filter((room) => !room.isActive).length, icon: EyeOff },
        ].map(({ key, label, value, icon: Icon }) => (
          <article key={key} className="rounded-2xl bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted-background text-ink">
              <Icon className="size-5" />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-ink">{value}</p>
          </article>
        ))}
      </div>

      <div className="relative mt-6 max-w-md">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin.rooms.searchPlaceholder")}
          aria-label={t("admin.rooms.searchAria")}
          className="h-11 rounded-lg pl-10 text-sm"
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((room) => (
          <article key={room.id} className="overflow-hidden rounded-2xl bg-card">
            <div className="relative aspect-[16/10] bg-muted-background">
              {room.thumbnail ? (
                <Image
                  src={room.thumbnail}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-muted-foreground">
                  <Box className="size-8" />
                </span>
              )}
              <Badge
                variant={room.isActive ? "primary" : "muted"}
                className="absolute right-3 top-3 backdrop-blur-sm"
              >
                {room.isActive ? t("admin.rooms.published") : t("admin.rooms.hidden")}
              </Badge>
            </div>

            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t(ROOM_TYPE_KEYS[room.type])}
              </p>
              <h2 className="mt-1 text-base font-bold text-ink">{room.name}</h2>
              {room.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
              )}
              <p className="mt-3 truncate font-data text-xs text-muted-foreground">{room.modelUrl}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openEdit(room)}
                  className="h-9 gap-1.5 text-xs font-bold"
                >
                  <Pencil className="size-3.5" /> {t("admin.rooms.edit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void toggleActive(room)}
                  className="h-9 gap-1.5 text-xs font-bold"
                >
                  {room.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {room.isActive ? t("admin.rooms.hide") : t("admin.rooms.publish")}
                </Button>
                <ConfirmDialog
                  title={t("admin.rooms.deleteRoomTitle")}
                  description={t("admin.rooms.deleteRoomDescription", { name: room.name })}
                  confirmLabel={t("admin.rooms.deleteRoomConfirm")}
                  onConfirm={() => void remove(room)}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" /> {t("admin.rooms.delete")}
                    </Button>
                  }
                />
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            {t("admin.rooms.noMatch")}
          </p>
        )}
      </div>

      <Dialog open={creating || editing !== null} onOpenChange={(open: boolean) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("admin.rooms.dialogEditTitle") : t("admin.rooms.dialogAddTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.rooms.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="room-name">{t("admin.rooms.roomNameLabel")}</FieldLabel>
              <Input
                id="room-name"
                required
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("admin.rooms.roomNamePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-type">{t("admin.rooms.roomTypeLabel")}</FieldLabel>
              <Select
                value={draft.type}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, type: (value ?? current.type) as RoomType }))
                }
              >
                <SelectTrigger id="room-type" className="h-10 w-full text-sm">
                  <SelectValue>{(value) => t(ROOM_TYPE_KEYS[value as RoomType])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(ROOM_TYPE_KEYS[type])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="room-description">{t("admin.rooms.descriptionLabel")}</FieldLabel>
              <Textarea
                id="room-description"
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={t("admin.rooms.descriptionPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-model">{t("admin.rooms.modelUrlLabel")}</FieldLabel>
              <Input
                id="room-model"
                required
                value={draft.modelUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, modelUrl: event.target.value }))
                }
                placeholder={t("admin.rooms.modelUrlPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-thumbnail">{t("admin.rooms.thumbnailLabel")}</FieldLabel>
              <Input
                id="room-thumbnail"
                value={draft.thumbnail}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, thumbnail: event.target.value }))
                }
                placeholder={t("admin.rooms.thumbnailPlaceholder")}
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} className="h-10 px-5 text-sm font-bold">
                {t("admin.rooms.cancel")}
              </Button>
              <Button type="submit" disabled={!valid || saving} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                {saving ? t("admin.rooms.saving") : editing ? t("admin.rooms.saveChanges") : t("admin.rooms.addRoom")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
