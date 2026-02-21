"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function LocaleBoundary({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <>{children}</>;
}
