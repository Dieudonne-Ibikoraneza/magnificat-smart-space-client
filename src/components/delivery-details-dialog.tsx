"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";
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
import { PhoneField, RWANDA_PREFIX, toRwandaDigits } from "@/components/phone-field";
import { useCurrentUser } from "@/lib/current-user";
import { isValidRwandaMobileDigits } from "@/lib/validation";
import type { DeliveryDetails } from "@/data/order-workflow";

const fieldClassName = "h-11 text-sm";

const emptyDetails: DeliveryDetails = {
  contactName: "",
  phone: "",
  address: "",
  city: "",
  preferredDate: "",
  notes: "",
};

export const DeliveryDetailsDialog = ({
  trigger,
  initialValue,
  onSubmit,
  successDescription,
  defaultOpen = false,
}: {
  trigger: ReactElement;
  initialValue?: DeliveryDetails;
  onSubmit: (details: DeliveryDetails) => void;
  /** Customer-facing copy by default; staff callers (adding it on a customer's behalf) pass their own. */
  successDescription?: string;
  /** Opens the dialog immediately on mount — e.g. right after a staff member creates an order, prompting for delivery details before they even look for the button. */
  defaultOpen?: boolean;
}) => {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const successText = successDescription ?? t("dash.deliveryDialog.defaultSuccess");
  // Defaults to the account's own name/phone (still freely editable — this
  // order might ship to someone else) so the customer isn't retyping what
  // we already have on file every time.
  const defaultValue = (): DeliveryDetails =>
    initialValue ?? { ...emptyDetails, contactName: user?.fullName ?? "", phone: user?.phone ?? "" };

  const [open, setOpen] = useState(defaultOpen);
  const [values, setValues] = useState<DeliveryDetails>(defaultValue);

  const update = (key: keyof DeliveryDetails) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const phoneDigits = toRwandaDigits(values.phone);
  const updatePhone = (digits: string) => setValues((current) => ({ ...current, phone: `${RWANDA_PREFIX}${digits}` }));

  const valid =
    values.contactName.trim() !== "" &&
    isValidRwandaMobileDigits(phoneDigits) &&
    values.address.trim() !== "" &&
    values.city.trim() !== "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSubmit(values);
    setOpen(false);
    toast.success(t("dash.deliveryDialog.toastSaved"), { description: successText });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValues(defaultValue());
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-ink">
            <Truck className="size-5" />
          </span>
          <DialogTitle className="pt-3">{t("dash.deliveryDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("dash.deliveryDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="delivery-contact-name" className="text-sm font-medium text-ink">{t("dash.deliveryDialog.contactName")}</FieldLabel>
              <Input id="delivery-contact-name" required value={values.contactName} onChange={update("contactName")} placeholder={t("dash.deliveryDialog.contactNamePlaceholder")} className={fieldClassName} />
            </Field>
            <PhoneField value={phoneDigits} onChange={updatePhone} label={t("dash.deliveryDialog.phone")} />
          </div>
          <Field>
            <FieldLabel htmlFor="delivery-address" className="text-sm font-medium text-ink">{t("dash.deliveryDialog.address")}</FieldLabel>
            <Input id="delivery-address" required value={values.address} onChange={update("address")} placeholder={t("dash.deliveryDialog.addressPlaceholder")} className={fieldClassName} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="delivery-city" className="text-sm font-medium text-ink">{t("dash.deliveryDialog.city")}</FieldLabel>
              <Input id="delivery-city" required value={values.city} onChange={update("city")} placeholder={t("dash.deliveryDialog.cityPlaceholder")} className={fieldClassName} />
            </Field>
            <Field>
              <FieldLabel htmlFor="delivery-date" className="text-sm font-medium text-ink">{t("dash.deliveryDialog.preferredDate")}</FieldLabel>
              <Input id="delivery-date" value={values.preferredDate ?? ""} onChange={update("preferredDate")} placeholder={t("dash.deliveryDialog.preferredDatePlaceholder")} className={fieldClassName} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="delivery-notes" className="text-sm font-medium text-ink">{t("dash.deliveryDialog.notes")}</FieldLabel>
            <Textarea id="delivery-notes" value={values.notes ?? ""} onChange={update("notes")} placeholder={t("dash.deliveryDialog.notesPlaceholder")} rows={3} className="text-sm" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-sm font-bold">
              {t("dash.deliveryDialog.cancel")}
            </Button>
            <Button type="submit" disabled={!valid} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
              {t("dash.deliveryDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
