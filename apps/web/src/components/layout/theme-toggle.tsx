"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme-preference";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setMounted(true);
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border/40 bg-background/60 text-muted-foreground/80 rounded-full px-3 py-2 text-xs uppercase"
        disabled
        aria-label={t("header.theme.toggle")}
      >
        …
      </Button>
    );
  }

  const isDark = theme === "dark";
  const label = isDark ? t("header.theme.light") : t("header.theme.dark");
  const shortLabel = isDark ? t("header.theme.short.light") : t("header.theme.short.dark");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border-border/40 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center gap-2 rounded-full px-3 py-2 text-xs tracking-[0.18em] uppercase"
      aria-label={label}
    >
      <svg className="size-4" aria-hidden>
        <use href={isDark ? "#icon-sun" : "#icon-moon"} />
      </svg>
      <span className="hidden sm:inline">{shortLabel}</span>
    </Button>
  );
}
