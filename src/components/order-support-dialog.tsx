"use client";

import { useTranslation } from "react-i18next";
import { Headset, Mail, MessageCircle, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type OrderSupportReason = "edit" | "stuck";

const COPY_KEYS: Record<OrderSupportReason, { title: string; description: string }> = {
  edit: { title: "dash.orderSupport.editTitle", description: "dash.orderSupport.editDescription" },
  stuck: { title: "dash.orderSupport.stuckTitle", description: "dash.orderSupport.stuckDescription" },
};

const channels = [
  { icon: Phone, labelKey: "dash.orderSupport.callUs", value: "+250 788 300 400", href: "tel:+250788300400" },
  { icon: Mail, labelKey: "dash.orderSupport.emailUs", value: "support@magnificatsmartspace.rw", href: "mailto:support@magnificatsmartspace.rw" },
  { icon: MessageCircle, labelKey: "dash.orderSupport.whatsapp", value: "+250 788 300 400", href: "https://wa.me/250788300400" },
];

export const OrderSupportDialog = ({
  reason = "edit",
  trigger,
}: {
  reason?: OrderSupportReason;
  trigger: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const title = t(COPY_KEYS[reason].title);
  const description = t(COPY_KEYS[reason].description);

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-ink">
            <Headset className="size-5" />
          </span>
          <DialogTitle className="pt-3">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-2.5">
          {channels.map(({ icon: Icon, labelKey, value, href }) => (
            <a
              key={labelKey}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(labelKey)}</span>
                <span className="block truncate text-sm font-medium text-ink">{value}</span>
              </span>
            </a>
          ))}
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto sm:self-center">
            {t("dash.orderSupport.responseNote")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
