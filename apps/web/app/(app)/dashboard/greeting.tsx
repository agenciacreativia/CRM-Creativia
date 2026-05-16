"use client";

import { useTranslation } from "react-i18next";

function timeBasedGreeting(): "Buenos días" | "Buenas tardes" | "Buenas noches" {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function Greeting({ nombre, tenant }: { nombre: string; tenant: string }) {
  const { t } = useTranslation();
  const firstName = nombre.split(" ")[0];
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        {timeBasedGreeting()} {firstName}
      </h1>
      <p className="text-sm text-gray-500 mt-1.5">
        {t("dashboard.tenant_context", { tenant })}
      </p>
    </div>
  );
}
