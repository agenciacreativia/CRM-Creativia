"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  rol: "admin" | "asesor" | null;
};

export function NavLinks({ rol }: Props) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const baseLinks = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/empresas", label: t("nav.empresas") },
    { href: "/contactos", label: t("nav.contactos") },
    { href: "/oportunidades", label: t("nav.oportunidades") },
  ];

  const adminLinks =
    rol === "admin"
      ? [{ href: "/admin/usuarios", label: t("nav.admin") }]
      : [];

  const links = [...baseLinks, ...adminLinks];

  return (
    <nav className="hidden md:flex items-center gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              active
                ? "bg-blue-50 text-brand-primary font-medium"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
