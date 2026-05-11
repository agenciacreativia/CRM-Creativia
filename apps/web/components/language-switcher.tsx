"use client";

import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? "es";

  function toggle() {
    const next = current === "es" ? "en" : "es";
    i18n.changeLanguage(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
      aria-label="Toggle language"
    >
      {current === "es" ? "ES" : "EN"}
    </button>
  );
}
