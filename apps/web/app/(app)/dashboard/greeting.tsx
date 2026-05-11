"use client";

import { useTranslation } from "react-i18next";

export function Greeting({ nombre, tenant }: { nombre: string; tenant: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {t("dashboard.greeting", { nombre })}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {t("dashboard.tenant_context", { tenant })}
      </p>
    </div>
  );
}
