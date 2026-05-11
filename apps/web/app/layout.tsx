import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";

export const metadata: Metadata = {
  title: "CRM Turistea",
  description: "Multi-tenant CRM for sales management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
