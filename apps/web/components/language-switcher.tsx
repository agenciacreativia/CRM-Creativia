"use client";

import { useTranslation } from "react-i18next";
import { LANG_STORAGE_KEY } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? "es";

  function toggle() {
    const next = current === "es" ? "en" : "es";
    i18n.changeLanguage(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore — private mode etc.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
      aria-label="Toggle language"
    >
      {current === "es" ? "ES" : "EN"}
    </button>
  );
}
