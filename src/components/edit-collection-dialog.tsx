"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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

/**
 * Edits title, description, and cover image — size and tile area are left
 * out, since every product already in the collection shares its box/piece
 * math with them, and changing either here would silently invalidate that.
 */
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
  const [description, setDescription] = useState(collection.description ?? "");
  const [image, setImage] = useState(collection.image ?? "");
  const [submitting, setSubmitting] = useState(false);

  const titleValid = title.trim().length >= 2;
  const valid = titleValid;

  const resetToCollection = () => {
    setTitle(collection.title);
    setDescription(collection.description ?? "");
    setImage(collection.image ?? "");
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await collectionsApi.update(collection.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        image: image.trim() || undefined,
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
          <DialogDescription>
            Tile size and area aren&apos;t editable here — every product in this collection shares them.
          </DialogDescription>
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
            <FieldLabel htmlFor="edit-collection-image">Cover Image URL</FieldLabel>
            <Input
              id="edit-collection-image"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://..."
            />
          </Field>

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
