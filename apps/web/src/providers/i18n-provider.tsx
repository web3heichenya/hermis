"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import { useLanguageStore } from "@/store/language-store";

export function I18nProvider({ children }: { children: ReactNode }) {
  const { initializeLanguage } = useLanguageStore();

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
