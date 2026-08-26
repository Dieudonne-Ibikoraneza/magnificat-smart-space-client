"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Bold, CheckCircle2, ImagePlus, Layers3, Ruler, Save, Tag, X } from "lucide-react";
import { AdminDetailHeader } from "@/app/admin/layout";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const isValidTitle = (value: string) => value.trim().length >= 2 && value.trim().length <= 80;
const isValidSize = (value: string) => /^\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*cm$/i.test(value.trim());
const isValidDescription = (value: string) => value.trim().length >= 10;

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isValid: (value: string) => boolean;
  errorMessage: string;
  icon?: typeof Tag;
  hint?: string;
};

const ValidatedInput = ({ label, placeholder, value, onChange, isValid, errorMessage, icon: Icon, hint }: FieldProps) => {
  const [touched, setTouched] = useState(false);
  const valid = isValid(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-ink">{label}</FieldLabel>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
        )}
        <Input
          className={cn("h-11 text-sm", Icon ? "pl-11" : "pl-3.5", "pr-10")}
          placeholder={placeholder}
          value={value}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {valid && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
      </div>
      {showError ? (
        <p className="text-xs font-medium text-red-600">{errorMessage}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Field>
  );
};

const ImageDropzone = ({
  previewUrl,
  onSelect,
  onClear,
}: {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Unsupported file", { description: "Please choose an image file (PNG, JPG, WEBP)." });
      return;
    }
    onSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div>
      {previewUrl ? (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted-background">
          <Image src={previewUrl} alt="Collection preview" fill unoptimized className="object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onClear}
            aria-label="Remove image"
            className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm hover:bg-white"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/40 hover:bg-secondary/60",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm">
            <ImagePlus className="size-5" strokeWidth={1.8} />
          </span>
          <p className="text-sm font-semibold text-ink">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground">PNG, JPG or WEBP</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
};

/** Renders text where **double-asterisk** spans are shown bold. */
const renderBoldPreview = (value: string) =>
  value.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4 ? (
      <strong key={index} className="font-bold text-ink">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  );

const BoldTextarea = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const toggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const alreadyBold = before.endsWith("**") && after.startsWith("**");
    let next: string;
    let cursorStart: number;
    let cursorEnd: number;

    if (alreadyBold) {
      next = before.slice(0, -2) + selected + after.slice(2);
      cursorStart = selectionStart - 2;
      cursorEnd = selectionEnd - 2;
    } else if (selected.length > 0) {
      next = `${before}**${selected}**${after}`;
      cursorStart = selectionStart + 2;
      cursorEnd = selectionEnd + 2;
    } else {
      next = `${before}****${after}`;
      cursorStart = selectionStart + 2;
      cursorEnd = selectionStart + 2;
    }

    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-secondary/40 px-2 py-1.5">
        <button
          type="button"
          onClick={toggleBold}
          aria-label="Bold"
          className="inline-flex size-7 items-center justify-center rounded text-ink hover:bg-secondary"
        >
          <Bold className="size-4" strokeWidth={2.25} />
        </button>
        <span className="ml-1 text-xs text-muted-foreground">Select text, then Bold</span>
      </div>
      <Textarea
        ref={textareaRef}
        className="min-h-28 rounded-t-none text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
            event.preventDefault();
            toggleBold();
          }
        }}
      />
      {value.includes("**") && (
        <div className="mt-2 rounded-md border border-border bg-secondary/30 p-3 text-sm text-ink">
          {renderBoldPreview(value)}
        </div>
      )}
    </div>
  );
};

const RegisterCollectionPage = () => {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const formValid =
    isValidTitle(title) && isValidSize(size) && isValidDescription(description) && imageFile !== null;

  const handleSubmit = () => {
    if (!formValid) {
      toast.error("Check the highlighted fields", {
        description: "All fields, including a cover image, are required to create a collection.",
      });
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Collection created", {
        description: `${title.trim()} (${size.trim()}) was added to your collections.`,
      });
      router.push("/admin/collections");
    }, 600);
  };

  return (
    <>
      <AdminDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/admin/overview" },
          { label: "Collections", href: "/admin/collections" },
          { label: "New Collection" },
        ]}
        title="Create New Collection"
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")} className="h-11 px-5 text-sm font-bold">
            Cancel
          </Button>
        }
      />

      <form
        className="space-y-5 sm:space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_1.4fr]">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Cover Image</h2>
            <p className="mt-1 text-sm text-muted-foreground">A clear, well-lit photo representing the collection.</p>
            <div className="mt-5">
              <ImageDropzone previewUrl={imagePreview} onSelect={handleImageSelect} onClear={clearImage} />
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Collection Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every product added to this collection will share its tile size.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <ValidatedInput
                label="Collection Title"
                placeholder="50×50cm Floor Tiles"
                value={title}
                onChange={setTitle}
                isValid={isValidTitle}
                errorMessage="Enter a title between 2 and 80 characters."
                icon={Tag}
              />
              <ValidatedInput
                label="Tile Size"
                placeholder="50×50cm"
                value={size}
                onChange={setSize}
                isValid={isValidSize}
                errorMessage="Use the format WIDTHxHEIGHTcm, e.g. 50×50cm."
                hint="Shared by every product added to this collection."
                icon={Ruler}
              />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4">
              <Layers3 className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Box coverage and pieces per box are set per product, using this collection&apos;s tile size.
              </p>
            </div>

            <div className="mt-6">
              <FieldLabel className="text-sm font-medium text-ink">Description</FieldLabel>
              <p className="mt-0.5 text-xs text-muted-foreground">Shown on the collection&apos;s detail page.</p>
              <div className="mt-2.5">
                <BoldTextarea
                  placeholder="Grand format tiles for seamless, luxurious open spaces. Ideal for statement walls and expansive floors."
                  value={description}
                  onChange={setDescription}
                />
                {description.length > 0 && !isValidDescription(description) && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">Write at least 10 characters.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 pb-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")} className="h-12 px-6 text-sm font-bold">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !formValid} className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-60">
            <Save className="size-4" />
            {submitting ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </>
  );
};

export default RegisterCollectionPage;
