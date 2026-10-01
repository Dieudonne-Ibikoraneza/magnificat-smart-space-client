"use client";

import type { ReactNode } from "react";
import { CurrentUserProvider } from "@/lib/current-user";
import { CartProvider } from "@/lib/cart-store";
import { FavoritesProvider } from "@/lib/favorites-store";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/config";
import { GlobalOrderAlertDialog } from "@/components/global-order-alert-dialog";
import { Toaster } from "@/components/ui/toast";

/** One client boundary keeps the session provider above every route and consumer. */
export const AppProviders = ({ children, locale }: { children: ReactNode; locale: Locale }) => (
  <I18nProvider locale={locale}>
    <CurrentUserProvider>
      <CartProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </CartProvider>
      <GlobalOrderAlertDialog />
    </CurrentUserProvider>
    <Toaster />
  </I18nProvider>
);
