import { create } from "zustand";
import { persist } from "zustand/middleware";

type Language = "en" | "zh";

type LanguageStoreState = {
  language: Language;
};

type LanguageStoreActions = {
  setLanguage: (language: Language) => void;
  initializeLanguage: () => void;
};

const LANGUAGE_STORE_NAME = "hermis-language-store";
const LANGUAGE_DETECTOR_KEY = "hermis-language";
const DEFAULT_LANGUAGE: Language = "en";

export const useLanguageStore = create<LanguageStoreState & LanguageStoreActions>()(
  persist(
    (set, get) => ({
      language: getInitialLanguage(),

      setLanguage: (language: Language) => {
        set({ language });
        persistLanguagePreference(language);
        updateI18nLanguage(language);
      },

      initializeLanguage: () => {
        const { language } = get();
        persistLanguagePreference(language);
        updateI18nLanguage(language);

        // Also sync back from i18n if it has a different language set
        if (typeof window !== "undefined") {
          import("@/lib/i18n").then((i18nModule) => {
            const i18n = i18nModule.default;
            if (
              i18n.language &&
              i18n.language !== language &&
              (i18n.language === "en" || i18n.language === "zh")
            ) {
              const detectedLanguage = i18n.language as Language;
              set({ language: detectedLanguage });
              persistLanguagePreference(detectedLanguage);
            }
          });
        }
      },
    }),
    {
      name: LANGUAGE_STORE_NAME,
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        persistLanguagePreference(state.language);
        updateI18nLanguage(state.language);
      },
    }
  )
);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const hinted = (window as Window & { __hermisLanguage?: Language }).__hermisLanguage;
  if (hinted === "en" || hinted === "zh") {
    return hinted;
  }

  const persisted = readPersistedLanguage();
  if (persisted) {
    return persisted;
  }

  return DEFAULT_LANGUAGE;
}

function readPersistedLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LANGUAGE_DETECTOR_KEY);
    if (raw === "en" || raw === "zh") {
      return raw;
    }
  } catch {
    // no-op
  }

  try {
    const persisted = window.localStorage.getItem(LANGUAGE_STORE_NAME);
    if (!persisted) {
      return null;
    }

    const parsed = JSON.parse(persisted) as {
      state?: { language?: string };
    } | null;
    const language = parsed?.state?.language;
    if (language === "en" || language === "zh") {
      return language;
    }
  } catch {
    // no-op
  }

  return null;
}

function updateI18nLanguage(language: Language) {
  if (typeof window === "undefined") return;

  // Dynamically import i18n to avoid SSR issues
  import("@/lib/i18n").then((i18nModule) => {
    const i18n = i18nModule.default;
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  });
}

function persistLanguagePreference(language: Language) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LANGUAGE_DETECTOR_KEY, language);
  } catch {
    // no-op
  }

  (window as Window & { __hermisLanguage?: Language }).__hermisLanguage = language;

  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `NEXT_LOCALE=${language}; path=/; max-age=${maxAge}`;
  } catch {
    // no-op
  }
}
