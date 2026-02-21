import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Import translation files
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

const LANGUAGE_DETECTOR_KEY = "hermis-language";
const DEFAULT_LANGUAGE = "en" as const;

export const defaultNS = "translation";

export const resources = {
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
} as const;

const initialLanguage = detectInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS,
    resources,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "cookie", "navigator", "htmlTag"],
      caches: ["localStorage", "cookie"],
      lookupCookie: "NEXT_LOCALE",
      lookupLocalStorage: LANGUAGE_DETECTOR_KEY,
    },
  });

export default i18n;

function detectInitialLanguage(): "en" | "zh" {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const hinted = (window as Window & { __hermisLanguage?: string }).__hermisLanguage;
  if (hinted === "en" || hinted === "zh") {
    return hinted;
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_DETECTOR_KEY);
    if (stored === "en" || stored === "zh") {
      return stored;
    }
  } catch {
    // no-op
  }

  return DEFAULT_LANGUAGE;
}
