"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { collectionsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiCollection } from "@/lib/api/types";

const tileAreaFromSize = (size: string) => {
  const match = size.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return "";
  return String(Math.round((Number(match[1]) / 100) * (Number(match[2]) / 100) * 10000) / 10000);
};

export const EditCollectionDialog = ({
  collection,
  onUpdated,
}: {
  collection: ApiCollection;
  /** Called after a successful edit so the parent can refetch the collection. */
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(collection.title);
  const [size, setSize] = useState(collection.size);
  const [tileAreaSqm, setTileAreaSqm] = useState(String(collection.tileAreaSqm));
  const [description, setDescription] = useState(collection.description ?? "");
  const [image, setImage] = useState(collection.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titleValid = title.trim().length >= 2;
  const sizeValid = /^\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*cm$/i.test(size.trim());
  const valid = titleValid && sizeValid;

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const resetToCollection = () => {
    setTitle(collection.title);
    setSize(collection.size);
    setTileAreaSqm(String(collection.tileAreaSqm));
    setDescription(collection.description ?? "");
    setImage(collection.image ?? "");
    setImageFile(null);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const uploaded = imageFile ? await collectionsApi.uploadImage(imageFile) : null;
      await collectionsApi.update(collection.id, {
        title: title.trim(),
        size: size.trim(),
        tileAreaSqm: Number(tileAreaSqm),
        description: description.trim() || undefined,
        image: uploaded?.path ?? (image.trim() || undefined),
      });
      onUpdated();
      toast.success("Collection updated", { description: `${title.trim()} was saved.` });
      setOpen(false);
    } catch (cause) {
      toast.error("Couldn't save changes", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToCollection();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="h-12 gap-2 font-bold uppercase px-4" />
        }
      >
        <Pencil className="size-4 stroke-3" />
        Edit Collection
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Update the collection details and replace its cover image when needed.</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="edit-collection-title">Collection Title</FieldLabel>
            <Input
              id="edit-collection-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {title.length > 0 && !titleValid && (
              <p className="text-xs font-medium text-red-600">Enter a title of at least 2 characters.</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Cover Image</FieldLabel>
            <div className="mt-1">
              {previewUrl || image ? (
                <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted-background">
                  <Image src={previewUrl ?? image} alt="Collection preview" fill unoptimized className="object-cover" />
                  <Button type="button" variant="secondary" size="icon-sm" onClick={() => { setImageFile(null); setImage(""); }} className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm">
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 text-center hover:bg-secondary/60">
                  <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm"><ImagePlus className="size-5" /></span>
                  <span className="text-sm font-semibold text-ink">Choose a replacement image</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · up to 10MB</span>
                </button>
              )}
              <input ref={inputRef} id="edit-collection-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => setImageFile(event.target.files?.[0] ?? null)} />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-collection-size">Tile Size</FieldLabel>
              <Input id="edit-collection-size" value={size} onChange={(event) => { const next = event.target.value; setSize(next); setTileAreaSqm(tileAreaFromSize(next)); }} placeholder="120×60cm" />
              {!sizeValid && size.length > 0 && <p className="text-xs font-medium text-red-600">Use WIDTHxHEIGHTcm.</p>}
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-collection-area">Tile Area (m²)</FieldLabel>
              <Input id="edit-collection-area" value={tileAreaSqm} readOnly aria-readonly="true" className="bg-secondary/40" />
              <p className="text-xs text-muted-foreground">Calculated from tile size.</p>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="edit-collection-description">Description</FieldLabel>
            <Textarea
              id="edit-collection-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Shown on the collection's detail page."
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="h-10 px-5 text-sm font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!valid || submitting}
            onClick={() => void handleSubmit()}
            className="h-10 px-5 text-sm font-bold disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteCollectionDialog = ({
  collection,
  onDeleted,
}: {
  collection: ApiCollection;
  onDeleted: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await collectionsApi.remove(collection.id);
      toast.success("Collection deleted", { description: `${collection.title} was removed.` });
      setOpen(false);
      onDeleted();
    } catch (cause) {
      toast.error("Couldn't delete collection", { description: cause instanceof ApiError ? cause.message : "Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" className="h-12 gap-2 font-bold uppercase px-4" />}>
        <Trash2 className="size-4 stroke-3" />
        Delete Collection
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete collection?</DialogTitle>
          <DialogDescription>This will hide “{collection.title}” from the catalog. Existing products will remain available.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting} className="h-10 px-5 text-sm font-bold">Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting} className="h-10 px-5 text-sm font-bold">{deleting ? "Deleting…" : "Delete collection"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
