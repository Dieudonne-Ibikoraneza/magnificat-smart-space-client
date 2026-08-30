"use client";

import { useState, type FormEvent, type ReactElement } from "react";
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
}: {
  trigger: ReactElement;
  initialValue?: DeliveryDetails;
  onSubmit: (details: DeliveryDetails) => void;
}) => {
  const { user } = useCurrentUser();
  // Defaults to the account's own name/phone (still freely editable — this
  // order might ship to someone else) so the customer isn't retyping what
  // we already have on file every time.
  const defaultValue = (): DeliveryDetails =>
    initialValue ?? { ...emptyDetails, contactName: user?.fullName ?? "", phone: user?.phone ?? "" };

  const [open, setOpen] = useState(false);
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
    toast.success("Delivery details saved", { description: "Attached to your order for the stock team to review." });
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
          <DialogTitle className="pt-3">Delivery details</DialogTitle>
          <DialogDescription>
            Tell us where and when to deliver. These details are attached to your order for the stock team&apos;s quotation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="delivery-contact-name" className="text-sm font-medium text-ink">Contact name</FieldLabel>
              <Input id="delivery-contact-name" required value={values.contactName} onChange={update("contactName")} placeholder="Full name" className={fieldClassName} />
            </Field>
            <PhoneField value={phoneDigits} onChange={updatePhone} label="Phone number" />
          </div>
          <Field>
            <FieldLabel htmlFor="delivery-address" className="text-sm font-medium text-ink">Delivery address</FieldLabel>
            <Input id="delivery-address" required value={values.address} onChange={update("address")} placeholder="Street, plot, neighborhood" className={fieldClassName} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="delivery-city" className="text-sm font-medium text-ink">City</FieldLabel>
              <Input id="delivery-city" required value={values.city} onChange={update("city")} placeholder="Kigali" className={fieldClassName} />
            </Field>
            <Field>
              <FieldLabel htmlFor="delivery-date" className="text-sm font-medium text-ink">Preferred delivery date</FieldLabel>
              <Input id="delivery-date" value={values.preferredDate ?? ""} onChange={update("preferredDate")} placeholder="e.g. Sep 5, 2026" className={fieldClassName} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="delivery-notes" className="text-sm font-medium text-ink">Notes (optional)</FieldLabel>
            <Textarea id="delivery-notes" value={values.notes ?? ""} onChange={update("notes")} placeholder="Access instructions, site contact, etc." rows={3} className="text-sm" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-sm font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
              Save delivery details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
