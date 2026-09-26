"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usersApi } from "@/lib/api";
import type { CustomerSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateCustomerDialog({
  onCreated,
}: {
  onCreated?: (customer: CustomerSummary) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const customer = await usersApi.createCustomer({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onCreated?.(customer);
      setFullName("");
      setEmail("");
      setPhone("");
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("sales.createCustomer.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="h-11 px-4 text-sm font-bold" />
        }
      >
        <Plus className="size-4" /> {t("sales.createCustomer.trigger")}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sales.createCustomer.title")}</DialogTitle>
          <DialogDescription>
            {t("sales.createCustomer.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-ink">
            {t("sales.createCustomer.name")}
            <input
              required
              minLength={2}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-ink">
            {t("sales.createCustomer.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-ink">
            {t("sales.createCustomer.phone")}
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+250 7xx xxx xxx"
              className="h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("sales.createCustomer.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || fullName.trim().length < 2}
            >
              {loading
                ? t("sales.createCustomer.saving")
                : t("sales.createCustomer.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
