import type { Metadata } from "next";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Magnificat Smart Space",
  description: "Your smarter, simpler living space.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", inter.variable, manrope.variable)}>
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

export default RootLayout;
