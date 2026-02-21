"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

const featureKeys = ["modularity", "reputation", "automation"] as const;

const featureIcons: Record<(typeof featureKeys)[number], ReactElement> = {
  modularity: (
    <svg viewBox="0 0 64 64" className="text-primary h-10 w-10" aria-hidden>
      <path d="M12 24L32 12l20 12v24l-20 12-20-12V24Z" fill="currentColor" fillOpacity="0.4" />
      <path
        d="M32 4 8 18v28l24 14 24-14V18L32 4Zm0 4.62 18 10.5V42.6L32 53.12 14 42.6V19.12l18-10.5Z"
        fill="currentColor"
      />
    </svg>
  ),
  reputation: (
    <svg viewBox="0 0 64 64" className="text-primary h-10 w-10" aria-hidden>
      <path
        d="M32 6c11.598 0 21 9.402 21 21s-9.402 21-21 21-21-9.402-21-21S20.402 6 32 6Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M32 12c8.284 0 15 6.716 15 15 0 8.284-6.716 15-15 15s-15-6.716-15-15c0-8.284 6.716-15 15-15Zm0 6a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 24c8.837 0 16 6.716 16 15v1H16v-1c0-8.284 7.163-15 16-15Z"
        fill="currentColor"
      />
    </svg>
  ),
  automation: (
    <svg viewBox="0 0 64 64" className="text-primary h-10 w-10" aria-hidden>
      <path
        d="M32 8c13.255 0 24 10.745 24 24S45.255 56 32 56 8 45.255 8 32 18.745 8 32 8Zm0 6C22.611 14 15 21.611 15 31s7.611 17 17 17 17-7.611 17-17S41.389 14 32 14Zm0 6c6.075 0 11 4.925 11 11s-4.925 11-11 11-11-4.925-11-11 4.925-11 11-11Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <path
        d="M32 22a10 10 0 1 1-10 10 10 10 0 0 1 10-10Zm0-10 3.09 6.18 6.82.99-4.95 4.83 1.17 6.8L32 26.92 25.87 30.8l1.17-6.8-4.95-4.83 6.82-.99L32 12Z"
        fill="currentColor"
      />
    </svg>
  ),
};

export function LandingFeatures() {
  const { t } = useTranslation(undefined, { keyPrefix: "landing.features" });

  return (
    <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20">
      <div className="max-w-3xl space-y-4 text-center sm:text-left">
        <h2 className="text-3xl font-semibold text-balance text-white sm:text-4xl">{t("title")}</h2>
        <p className="text-muted-foreground text-base sm:text-lg">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureKeys.map((key) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-40px_rgba(124,92,255,0.8)] backdrop-blur transition-transform hover:-translate-y-1 hover:shadow-[0_40px_120px_-60px_rgba(124,92,255,0.9)]"
          >
            <div className="from-primary/40 absolute -inset-32 -z-10 bg-gradient-to-br via-fuchsia-500/20 to-transparent opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
            <div className="bg-primary/15 mb-4 inline-flex items-center justify-center rounded-2xl p-3">
              {featureIcons[key]}
            </div>
            <h3 className="text-lg font-semibold text-white">{t(`items.${key}.title`)}</h3>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t(`items.${key}.description`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
