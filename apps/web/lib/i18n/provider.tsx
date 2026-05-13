"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANG_STORAGE_KEY } from "./config";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved language preference only after hydration. The server always
    // renders in "es" so the initial client tree matches; this useEffect runs
    // post-hydration and triggers a re-render in the saved language.
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if ((saved === "es" || saved === "en") && i18n.resolvedLanguage !== saved) {
      i18n.changeLanguage(saved);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
