"use client";

import { useTranslation } from "react-i18next";
import { Headset, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { ApiErrorState } from "@/components/api-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export type OrderSupportReason = "edit" | "stuck";

const COPY_KEYS: Record<OrderSupportReason, { title: string; description: string }> = {
  edit: { title: "dash.orderSupport.editTitle", description: "dash.orderSupport.editDescription" },
  stuck: { title: "dash.orderSupport.stuckTitle", description: "dash.orderSupport.stuckDescription" },
};

type Channel = { icon: LucideIcon; labelKey: string; value: string; href: string };

/**
 * The contact channels an admin has set (Settings → Customer support contacts). Read when the
 * dialog opens, so a change shows straight away, and a channel left empty is simply not offered.
 * WhatsApp links need the bare international digits; `tel:` keeps the leading "+".
 */
const SupportChannels = () => {
  const { t } = useTranslation();
  const { data: settings, loading, error, reload } = useApi(() => settingsApi.get());

  if (error) return <ApiErrorState message={t("dash.orderSupport.loadFailed")} onRetry={reload} />;
  if (loading || !settings) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[62px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const phone = (settings["support.phone"] ?? "").trim();
  const email = (settings["support.email"] ?? "").trim();
  const whatsapp = (settings["support.whatsapp"] ?? "").trim();
  const channels: Channel[] = [
    phone && { icon: Phone, labelKey: "dash.orderSupport.callUs", value: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` },
    email && { icon: Mail, labelKey: "dash.orderSupport.emailUs", value: email, href: `mailto:${email}` },
    whatsapp && {
      icon: MessageCircle,
      labelKey: "dash.orderSupport.whatsapp",
      value: whatsapp,
      href: `https://wa.me/${whatsapp.replace(/\D/g, "")}`,
    },
  ].filter((channel): channel is Channel => !!channel);

  if (channels.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("dash.orderSupport.noChannels")}</p>;
  }

  return (
    <div className="space-y-2.5">
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
  );
};

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

        <div className="mt-5">
          <SupportChannels />
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
