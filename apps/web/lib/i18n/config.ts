import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, defaultNS } from "@crm/i18n";

/**
 * IMPORTANT: i18n always initializes with "es" on both server and client to
 * avoid hydration mismatches. The I18nProvider switches to the user's saved
 * preference inside a useEffect *after* hydration completes.
 */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "es",
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    defaultNS,
    ns: [defaultNS],
    interpolation: { escapeValue: false },
  });
}

export const LANG_STORAGE_KEY = "crm.lang";

export default i18n;
