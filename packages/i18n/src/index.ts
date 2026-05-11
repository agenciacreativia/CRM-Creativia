import es from "./locales/es.json";
import en from "./locales/en.json";

export const defaultNS = "common" as const;

export const resources = {
  es: { common: es },
  en: { common: en },
} as const;

export type Locale = keyof typeof resources;
export type TranslationKey = keyof typeof es;
