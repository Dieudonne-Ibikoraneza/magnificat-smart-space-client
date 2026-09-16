import type { Metadata } from "next";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { cookies, headers } from "next/headers";
import { cn } from "@/lib/utils";
import { CartProvider } from "@/lib/cart-store";
import { FavoritesProvider } from "@/lib/favorites-store";
import { CurrentUserProvider } from "@/lib/current-user";
import { I18nProvider, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage } from "@/lib/i18n";
import { Toaster } from "@/components/ui/toast";
import { GlobalOrderAlertDialog } from "@/components/global-order-alert-dialog";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Magnificat Smart Space",
  description: "Your smarter, simpler living space.",
};

const RootLayout = async ({ children }: LayoutProps<"/">) => {
  // Locale is resolved here so the first server render (and `<html lang>`)
  // is already correct: the `mss.lang` cookie if the visitor has chosen
  // one, otherwise a best guess from `Accept-Language`.
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored)
    ? stored
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  return (
    <html
      lang={locale}
      className={cn("h-full antialiased", "font-sans", inter.variable, manrope.variable)}
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        <I18nProvider locale={locale}>
          <CurrentUserProvider>
            <CartProvider>
              <FavoritesProvider>{children}</FavoritesProvider>
            </CartProvider>
            <GlobalOrderAlertDialog />
          </CurrentUserProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}

export default RootLayout;
