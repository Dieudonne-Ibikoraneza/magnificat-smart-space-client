"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { Box, Boxes, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
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
import {
  visualizerRooms,
  type RoomTypeLabel,
  type VisualizerRoom,
} from "@/data/room-designs";

const roomTypes: RoomTypeLabel[] = [
  "Living Room (Saloon)",
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Balcony",
  "Stairs",
  "Gates",
  "Outdoor",
];

type RoomDraft = Omit<VisualizerRoom, "id" | "isActive">;

const emptyDraft: RoomDraft = {
  type: "Living Room (Saloon)",
  name: "",
  description: "",
  thumbnail: "",
  modelUrl: "",
};

/**
 * Content management for the 3D rooms the visualizer offers (doc 3.10).
 * Publishing a room is what makes it selectable in the customer-facing
 * visualizer, so retiring one is a visibility toggle rather than a delete.
 */
export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState(visualizerRooms);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<VisualizerRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(term) || room.type.toLowerCase().includes(term),
    );
  }, [rooms, search]);

  const openCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (room: VisualizerRoom) => {
    setDraft({
      type: room.type,
      name: room.name,
      description: room.description,
      thumbnail: room.thumbnail,
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    if (editing) {
      setRooms((current) =>
        current.map((room) => (room.id === editing.id ? { ...room, ...draft } : room)),
      );
      toast.success("Room updated", { description: `${draft.name} has been saved.` });
    } else {
      setRooms((current) => [
        ...current,
        { ...draft, id: `room-${Date.now().toString(36)}`, isActive: true },
      ]);
      toast.success("Room added", { description: `${draft.name} is now available in the visualizer.` });
    }
    closeDialog();
  };

  const toggleActive = (id: string) => {
    let nowActive = false;
    setRooms((current) =>
      current.map((room) => {
        if (room.id !== id) return room;
        nowActive = !room.isActive;
        return { ...room, isActive: nowActive };
      }),
    );
    toast.success(nowActive ? "Room published" : "Room hidden", {
      description: nowActive
        ? "Customers can now pick this room in the visualizer."
        : "This room no longer appears in the visualizer.",
    });
  };

  const remove = (id: string) => {
    setRooms((current) => current.filter((room) => room.id !== id));
    toast.success("Room deleted");
  };

  return (
    <div className="pb-10">
      <AdminPageHeader title="3D Rooms" subtitle="Manage the rooms customers can design in.">
        <Button type="button" onClick={openCreate} className="h-11 shrink-0 gap-2 font-bold">
          <Plus className="size-4" /> Add room
        </Button>
      </AdminPageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total rooms", value: rooms.length, icon: Boxes },
          { label: "Published", value: rooms.filter((room) => room.isActive).length, icon: Eye },
          { label: "Hidden", value: rooms.filter((room) => !room.isActive).length, icon: EyeOff },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl bg-card p-5">
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
          placeholder="Search rooms by name or type..."
          aria-label="Search rooms"
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
                {room.isActive ? "Published" : "Hidden"}
              </Badge>
            </div>

            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {room.type}
              </p>
              <h2 className="mt-1 text-base font-bold text-ink">{room.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
              <p className="mt-3 truncate font-data text-xs text-muted-foreground">{room.modelUrl}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openEdit(room)}
                  className="h-9 gap-1.5 text-xs font-bold"
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleActive(room.id)}
                  className="h-9 gap-1.5 text-xs font-bold"
                >
                  {room.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {room.isActive ? "Hide" : "Publish"}
                </Button>
                <ConfirmDialog
                  title="Delete this room?"
                  description={`"${room.name}" and its 3D model reference will be removed. Saved customer designs that used it will no longer open.`}
                  confirmLabel="Delete room"
                  onConfirm={() => remove(room.id)}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  }
                />
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            No rooms match that search.
          </p>
        )}
      </div>

      <Dialog open={creating || editing !== null} onOpenChange={(open: boolean) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit room" : "Add a 3D room"}</DialogTitle>
            <DialogDescription>
              Rooms appear in the customer-facing visualizer once they&apos;re published.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="room-name">Room name</FieldLabel>
              <Input
                id="room-name"
                required
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Open-plan living room"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-type">Room type</FieldLabel>
              <Select
                value={draft.type}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, type: (value ?? current.type) as RoomTypeLabel }))
                }
              >
                <SelectTrigger id="room-type" className="h-10 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="room-description">Description</FieldLabel>
              <Textarea
                id="room-description"
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="What the space looks like and which surfaces can be tiled."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-model">3D model URL</FieldLabel>
              <Input
                id="room-model"
                required
                value={draft.modelUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, modelUrl: event.target.value }))
                }
                placeholder="/models/rooms/living_room.glb"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-thumbnail">Thumbnail URL</FieldLabel>
              <Input
                id="room-thumbnail"
                value={draft.thumbnail}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, thumbnail: event.target.value }))
                }
                placeholder="https://…"
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} className="h-10 px-5 text-sm font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={!valid} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                {editing ? "Save changes" : "Add room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
