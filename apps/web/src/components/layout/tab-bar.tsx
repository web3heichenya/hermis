"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { APP_NAV_ITEMS } from "./app-navigation";

export function TabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const currentPath = pathname ?? "/dashboard";

  return (
    <nav className="border-border/60 bg-background/95 sticky bottom-0 z-30 border-t backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {APP_NAV_ITEMS.map((tab) => {
          const isActive = currentPath.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
              }`}
            >
              <svg
                className={`size-6 transition-transform ${isActive ? "scale-110" : "scale-100"}`}
                aria-hidden
              >
                <use href={`#${tab.icon}`} />
              </svg>
              <span className="text-[11px] tracking-[0.14em] uppercase">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
