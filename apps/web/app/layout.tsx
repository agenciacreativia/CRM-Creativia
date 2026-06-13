import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";

// Self-host Poppins vía next/font: preload + display:swap automáticos, sin
// request a fonts.googleapis.com (más rápido, sin layout shift y sin depender
// del CSP de Google Fonts). Expone la fuente en la variable CSS --font-poppins.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Turistea CRM",
  description: "Plataforma de gestión para Turistea — Mayorista de Turismo",
  icons: {
    icon: "/turistea-logo.png",
  },
};

// Aplica el tema guardado ANTES del primer pintado para evitar el parpadeo
// (FOUC) de claro→oscuro en cada carga. Lee la misma clave que ThemeToggle.
const themeScript = `(function(){try{var t=localStorage.getItem('crm.theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
