"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ImagePlus,
  Layers3,
  Ruler,
  Save,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { AdminDetailHeader } from "@/app/[lang]/admin/layout";
import { Button } from "@/components/ui/button";
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
import { collectionsApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { RoomType, SuitableFor } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};
const roomTypeOptions = Object.keys(ROOM_TYPE_KEYS) as RoomType[];
const SUITABLE_FOR_KEYS: { value: SuitableFor; labelKey: string }[] = [
  { value: "FLOOR", labelKey: "stock.newProduct.floor" },
  { value: "WALL", labelKey: "stock.newProduct.wall" },
  { value: "BOTH", labelKey: "stock.newProduct.floorAndWall" },
];

const LOW_STOCK_THRESHOLD = 10;

const stockPreview = (quantity: number) => {
  if (quantity <= 0) return { labelKey: "stock.newProduct.stockOut", className: "border-red-200 bg-red-50 text-red-700" };
  if (quantity <= LOW_STOCK_THRESHOLD) return { labelKey: "stock.newProduct.stockLow", className: "border-amber/30 bg-amber-50 text-amber-700" };
  return { labelKey: "stock.newProduct.stockIn", className: "border-green-200 bg-green-50 text-green-700" };
};

const isValidName = (value: string) => value.trim().length >= 2 && value.trim().length <= 120;
/** Letters/numbers, with optional dashes between groups — accepts a single run like "GFT44063T" just as well as a segmented one like "SLB-CG-001". */
const isValidSku = (value: string) => /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(value.trim()) && value.trim().length >= 3 && value.trim().length <= 24;
const isPositiveNumber = (value: string) => value.trim() !== "" && Number(value) > 0;
const isValidDescription = (value: string) => value.trim().length >= 10;

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isValid: (value: string) => boolean;
  errorMessage: string;
  icon?: typeof Tag;
  type?: string;
  hint?: string;
  onBlurTransform?: (value: string) => string;
};

const ValidatedInput = ({
  label,
  placeholder,
  value,
  onChange,
  isValid,
  errorMessage,
  icon: Icon,
  type = "text",
  hint,
  onBlurTransform,
}: FieldProps) => {
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
          type={type}
          value={value}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            setTouched(true);
            if (onBlurTransform) onChange(onBlurTransform(value));
          }}
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
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error(t("stock.newProduct.unsupportedFile"), { description: t("stock.newProduct.unsupportedFileBody") });
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
          <Image src={previewUrl} alt={t("stock.newProduct.productPreviewAlt")} fill unoptimized className="object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onClear}
            aria-label={t("stock.newProduct.removeImageAria")}
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
          <p className="text-sm font-semibold text-ink">{t("stock.newProduct.clickToUpload")}</p>
          <p className="text-xs text-muted-foreground">{t("stock.newProduct.imageHint")}</p>
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
  const { t } = useTranslation();
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
          aria-label={t("stock.newProduct.boldAria")}
          className="inline-flex size-7 items-center justify-center rounded text-ink hover:bg-secondary"
        >
          <Bold className="size-4" strokeWidth={2.25} />
        </button>
        <span className="ml-1 text-xs text-muted-foreground">{t("stock.newProduct.boldToolbarHint")}</span>
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

const RegisterProductPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: collectionsData } = useApi(() => collectionsApi.list({ limit: 100 }));
  const collections = collectionsData?.items ?? [];

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [suitableFor, setSuitableFor] = useState<SuitableFor>("BOTH");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [price, setPrice] = useState("");
  const [boxCoverage, setBoxCoverage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const requestedCollectionId = searchParams.get("collectionId");
    if (requestedCollectionId && collections.some((item) => item.id === requestedCollectionId)) {
      setCollectionId(requestedCollectionId);
    }
  }, [searchParams, collections]);

  const toggleRoomType = (option: RoomType) => {
    setRoomTypes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const selectedCollection = collections.find((item) => item.id === collectionId) ?? null;
  const tileArea = selectedCollection ? Number(selectedCollection.tileAreaSqm) : null;
  const boxCoverageValue = boxCoverage.trim() === "" ? null : Number(boxCoverage);
  const piecesPerBox =
    tileArea && boxCoverageValue !== null && boxCoverageValue > 0
      ? Math.round(boxCoverageValue / tileArea)
      : null;
  const quantityValue = quantity.trim() === "" ? null : Number(quantity);
  const status = quantityValue !== null && quantityValue >= 0 ? stockPreview(quantityValue) : null;

  const formValid =
    isValidName(name) &&
    isValidSku(sku) &&
    selectedCollection !== null &&
    roomTypes.length > 0 &&
    isPositiveNumber(price) &&
    isPositiveNumber(boxCoverage) &&
    piecesPerBox !== null &&
    quantityValue !== null &&
    quantityValue >= 0 &&
    (costPrice.trim() === "" || isPositiveNumber(costPrice)) &&
    isValidDescription(description) &&
    imageFile !== null;

  const handleSubmit = async () => {
    if (!formValid || !imageFile || !selectedCollection || piecesPerBox === null) {
      toast.error(t("stock.newProduct.checkFieldsTitle"), {
        description: t("stock.newProduct.checkFieldsBody"),
      });
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await productsApi.uploadImage(imageFile);
      await productsApi.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        collectionId: selectedCollection.id,
        boxCoverageSqm: Number(boxCoverage),
        piecesPerBox,
        price: Number(price),
        image: uploaded.path,
        description: description.trim(),
        suitableFor,
        roomTypes,
        initialAreaSqm: quantityValue ?? undefined,
        initialCostPrice: costPrice.trim() !== "" ? Number(costPrice) : undefined,
      });
      toast.success(t("stock.newProduct.toastRegisteredTitle"), {
        description: t("stock.newProduct.toastRegisteredBody", { name: name.trim(), sku: sku.trim().toUpperCase() }),
      });
      router.push("/admin/inventory");
    } catch (cause) {
      toast.error(t("stock.newProduct.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("stock.newProduct.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminDetailHeader
        breadcrumbs={[
          { label: t("stock.newProduct.crumbOverview"), href: "/admin/overview" },
          { label: t("stock.newProduct.crumbInventory"), href: "/admin/inventory" },
          { label: t("stock.newProduct.crumbRegister") },
        ]}
        title={t("stock.newProduct.title")}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push("/admin/inventory")} className="h-11 px-5 text-sm font-bold">
            {t("stock.newProduct.cancel")}
          </Button>
        }
      />

      <form
        className="space-y-5 sm:space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_1.4fr]">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.productImage")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.productImageSub")}</p>
            <div className="mt-5">
              <ImageDropzone previewUrl={imagePreview} onSelect={handleImageSelect} onClear={clearImage} />
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.productDetails")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.productDetailsSub")}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <ValidatedInput
                label={t("stock.newProduct.name")}
                placeholder={t("stock.newProduct.namePlaceholder")}
                value={name}
                onChange={setName}
                isValid={isValidName}
                errorMessage={t("stock.newProduct.nameError")}
                icon={Tag}
              />
              <ValidatedInput
                label={t("stock.newProduct.sku")}
                placeholder={t("stock.newProduct.skuPlaceholder")}
                value={sku}
                onChange={(value) => setSku(value.toUpperCase())}
                isValid={isValidSku}
                errorMessage={t("stock.newProduct.skuError")}
                hint={t("stock.newProduct.skuHint")}
                icon={ClipboardCheck}
              />
              <Field className="gap-1.5 sm:col-span-2">
                <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.collection")}</FieldLabel>
                <Select value={collectionId} onValueChange={(value) => setCollectionId(value ?? "")}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue>
                      {(value) => collections.find((item) => item.id === value)?.title ?? t("stock.newProduct.selectCollection")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {selectedCollection && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4">
                <Ruler className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("stock.newProduct.tileSizeForCollection")} <span className="font-bold text-ink">{selectedCollection.size}</span>
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.suitableFor")}</FieldLabel>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SUITABLE_FOR_KEYS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSuitableFor(option.value)}
                    aria-pressed={suitableFor === option.value}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      suitableFor === option.value
                        ? "border-primary bg-primary text-ink"
                        : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {suitableFor === option.value && <Check className="size-3.5" />}
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.roomTypes")}</FieldLabel>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("stock.newProduct.roomTypesHint")}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {roomTypeOptions.map((option) => {
                  const checked = roomTypes.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleRoomType(option)}
                      aria-pressed={checked}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        checked
                          ? "border-primary bg-primary text-ink"
                          : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {checked && <Check className="size-3.5" />}
                      {t(ROOM_TYPE_KEYS[option])}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.priceBoxCoverage")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("stock.newProduct.priceBoxCoverageSub")}
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <ValidatedInput
                label={t("stock.newProduct.price")}
                placeholder={t("stock.newProduct.pricePlaceholder")}
                type="number"
                value={price}
                onChange={setPrice}
                isValid={isPositiveNumber}
                errorMessage={t("stock.newProduct.priceError")}
                icon={Wallet}
              />
              <ValidatedInput
                label={t("stock.newProduct.boxCoverage")}
                placeholder={t("stock.newProduct.boxCoveragePlaceholder")}
                type="number"
                value={boxCoverage}
                onChange={setBoxCoverage}
                isValid={isPositiveNumber}
                errorMessage={t("stock.newProduct.boxCoverageError")}
                hint={!selectedCollection ? t("stock.newProduct.boxCoverageHint") : undefined}
                icon={Layers3}
              />
              <Field className="gap-1.5">
                <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.piecesPerBox")}</FieldLabel>
                <div className="relative">
                  <Boxes
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    strokeWidth={1.5}
                  />
                  <Input
                    className="h-11 bg-secondary/40 pl-11 text-sm font-bold"
                    value={piecesPerBox !== null ? t("stock.newProduct.piecesValue", { count: piecesPerBox }) : ""}
                    placeholder={t("stock.newProduct.autoFilled")}
                    readOnly
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {tileArea
                    ? t("stock.newProduct.piecesHintWithArea", { area: tileArea })
                    : t("stock.newProduct.piecesHintNoCollection")}
                </p>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.inventory")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.inventorySub")}</p>
            <div className="mt-5 grid gap-5">
              <Field className="gap-1.5">
                <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.initialStock")}</FieldLabel>
                <div className="relative">
                  <Sparkles
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    strokeWidth={1.5}
                  />
                  <Input
                    className="h-11 pl-11 text-sm"
                    placeholder={t("stock.newProduct.initialStockPlaceholder")}
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
              </Field>
              <ValidatedInput
                label={t("stock.newProduct.costPrice")}
                placeholder={t("stock.newProduct.costPricePlaceholder")}
                type="number"
                value={costPrice}
                onChange={setCostPrice}
                isValid={(value) => value.trim() === "" || isPositiveNumber(value)}
                errorMessage={t("stock.newProduct.costPriceError")}
                hint={t("stock.newProduct.costPriceHint")}
                icon={Coins}
              />
              {status && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase",
                    status.className,
                  )}
                >
                  {t(status.labelKey)}
                </span>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.description")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.descriptionSub")}</p>
          <div className="mt-5">
            <BoldTextarea
              placeholder={t("stock.newProduct.descriptionPlaceholder")}
              value={description}
              onChange={setDescription}
            />
            {description.length > 0 && !isValidDescription(description) && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{t("stock.newProduct.descriptionError")}</p>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse items-stretch gap-3 pb-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/inventory")} className="h-12 px-6 text-sm font-bold">
            {t("stock.newProduct.cancel")}
          </Button>
          <Button type="submit" disabled={submitting || !formValid} className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-60">
            <Save className="size-4" />
            {submitting ? t("stock.newProduct.registering") : t("stock.newProduct.register")}
          </Button>
        </div>
      </form>
    </>
  );
};

export default RegisterProductPage;
