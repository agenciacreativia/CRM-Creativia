import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";

export const metadata: Metadata = {
  title: "Turistea CRM",
  description: "Plataforma de gestión para Turistea — Mayorista de Turismo",
  icons: {
    icon: "/turistea-logo.png",
  },
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
