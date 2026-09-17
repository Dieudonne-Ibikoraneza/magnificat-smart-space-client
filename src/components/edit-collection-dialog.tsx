"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { FileImagePreview, filePreviewKey } from "@/components/file-image-preview";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { collectionsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n";
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
  const { t } = useTranslation();
  const { locale } = useLocale();
  // Same convention as `EditProductDialog` — see there.
  const isRw = locale === "rw";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(isRw ? (collection.titleRw ?? collection.title) : collection.title);
  const [size, setSize] = useState(collection.size);
  const [tileAreaSqm, setTileAreaSqm] = useState(String(collection.tileAreaSqm));
  const [description, setDescription] = useState(
    isRw ? (collection.descriptionRw ?? collection.description ?? "") : (collection.description ?? ""),
  );
  const [image, setImage] = useState(collection.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titleValid = title.trim().length >= 2;
  const sizeValid = /^\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*cm$/i.test(size.trim());
  const valid = titleValid && sizeValid;

  const resetToCollection = () => {
    setTitle(isRw ? (collection.titleRw ?? collection.title) : collection.title);
    setSize(collection.size);
    setTileAreaSqm(String(collection.tileAreaSqm));
    setDescription(isRw ? (collection.descriptionRw ?? collection.description ?? "") : (collection.description ?? ""));
    setImage(collection.image ?? "");
    setImageFile(null);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const uploaded = imageFile ? await collectionsApi.uploadImage(imageFile) : null;
      await collectionsApi.update(collection.id, {
        ...(isRw
          ? { titleRw: title.trim(), descriptionRw: description.trim() || undefined }
          : { title: title.trim(), description: description.trim() || undefined }),
        size: size.trim(),
        tileAreaSqm: Number(tileAreaSqm),
        image: uploaded?.path ?? (image.trim() || undefined),
      });
      onUpdated();
      toast.success(t("staff.editCollection.toastUpdatedTitle"), {
        description: t("staff.editCollection.toastUpdatedBody", { name: title.trim() }),
      });
      setOpen(false);
    } catch (cause) {
      toast.error(t("staff.editCollection.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.editCollection.toastTryAgain"),
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
        {t("staff.editCollection.trigger")}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("staff.editCollection.title")}</DialogTitle>
          <DialogDescription>{t("staff.editCollection.description")}</DialogDescription>
        </DialogHeader>

        {isRw && (
          <p className="mt-4 rounded-lg bg-amber/10 px-3 py-2 text-xs font-medium text-ink">
            {t("staff.editCollection.editingRwHint")}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="edit-collection-title">{t("staff.editCollection.titleLabel")}</FieldLabel>
            <Input
              id="edit-collection-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {title.length > 0 && !titleValid && (
              <p className="text-xs font-medium text-red-600">{t("staff.editCollection.titleError")}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>{t("staff.editCollection.coverImage")}</FieldLabel>
            <div className="mt-1">
              {imageFile || image ? (
                <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted-background">
                  {imageFile ? (
                    <FileImagePreview
                      key={filePreviewKey(imageFile)}
                      file={imageFile}
                      alt={t("staff.editCollection.previewAlt")}
                    />
                  ) : (
                    <Image
                      src={image}
                      alt={t("staff.editCollection.previewAlt")}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                  <Button type="button" variant="secondary" size="icon-sm" onClick={() => { setImageFile(null); setImage(""); }} className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm">
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 text-center hover:bg-secondary/60">
                  <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm"><ImagePlus className="size-5" /></span>
                  <span className="text-sm font-semibold text-ink">{t("staff.editCollection.chooseImage")}</span>
                  <span className="text-xs text-muted-foreground">{t("staff.editCollection.imageHint")}</span>
                </button>
              )}
              <input ref={inputRef} id="edit-collection-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => setImageFile(event.target.files?.[0] ?? null)} />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-collection-size">{t("staff.editCollection.tileSize")}</FieldLabel>
              <Input id="edit-collection-size" value={size} onChange={(event) => { const next = event.target.value; setSize(next); setTileAreaSqm(tileAreaFromSize(next)); }} placeholder="120×60cm" />
              {!sizeValid && size.length > 0 && <p className="text-xs font-medium text-red-600">{t("staff.editCollection.sizeError")}</p>}
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-collection-area">{t("staff.editCollection.tileArea")}</FieldLabel>
              <Input id="edit-collection-area" value={tileAreaSqm} readOnly aria-readonly="true" className="bg-secondary/40" />
              <p className="text-xs text-muted-foreground">{t("staff.editCollection.tileAreaHint")}</p>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="edit-collection-description">{t("staff.editCollection.descriptionLabel")}</FieldLabel>
            <Textarea
              id="edit-collection-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("staff.editCollection.descriptionPlaceholder")}
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
            {t("staff.editCollection.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!valid || submitting}
            onClick={() => void handleSubmit()}
            className="h-10 px-5 text-sm font-bold disabled:opacity-60"
          >
            {submitting ? t("staff.editCollection.saving") : t("staff.editCollection.save")}
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await collectionsApi.remove(collection.id);
      toast.success(t("staff.deleteCollection.toastDeletedTitle"), {
        description: t("staff.deleteCollection.toastDeletedBody", { name: collection.title }),
      });
      setOpen(false);
      onDeleted();
    } catch (cause) {
      toast.error(t("staff.deleteCollection.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.deleteCollection.toastTryAgain"),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" className="h-12 gap-2 font-bold uppercase px-4" />}>
        <Trash2 className="size-4 stroke-3" />
        {t("staff.deleteCollection.trigger")}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("staff.deleteCollection.title")}</DialogTitle>
          <DialogDescription>{t("staff.deleteCollection.description", { name: collection.title })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting} className="h-10 px-5 text-sm font-bold">{t("staff.deleteCollection.cancel")}</Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting} className="h-10 px-5 text-sm font-bold">{deleting ? t("staff.deleteCollection.deleting") : t("staff.deleteCollection.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
