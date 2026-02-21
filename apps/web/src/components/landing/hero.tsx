"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { RotatingText } from "@/components/landing/rotating-text";

export function LandingHero() {
  const { t } = useTranslation(undefined, { keyPrefix: "landing.hero" });
  const topLine = t("headline.top").toUpperCase();
  const prefix = t("headline.prefix").toUpperCase();
  const rotatingWords = [
    t("headline.variants.one"),
    t("headline.variants.two"),
    t("headline.variants.three"),
  ].map((word) => word.toUpperCase());

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div className="relative z-10 space-y-6">
        <span className="bg-primary/15 text-primary inline-flex items-center justify-center rounded-full px-5 py-1 text-xs tracking-[0.28em] uppercase backdrop-blur">
          {t("label")}
        </span>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center uppercase">
          <p className="text-4xl leading-tight font-semibold text-white sm:text-5xl md:text-6xl">
            {topLine}
          </p>
          <p className="flex items-center justify-center gap-3 leading-tight font-semibold text-white">
            <span className="text-4xl sm:text-5xl md:text-6xl">{prefix}</span>
            <RotatingText
              words={rotatingWords}
              className="bg-primary/40 text-primary-foreground rounded-3xl px-4 py-1 text-3xl sm:px-6 sm:py-2 sm:text-4xl md:text-5xl"
            />
          </p>
        </div>
        <p className="mx-auto max-w-2xl text-sm text-white/80 uppercase sm:text-base">
          {t("subheading")}
        </p>
      </div>

      <div className="relative z-10 mt-10 flex flex-col items-center gap-4">
        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground shadow-primary/40 inline-flex items-center justify-center rounded-full px-10 py-3 text-sm font-semibold tracking-[0.22em] uppercase shadow-lg transition-transform hover:scale-[1.02]"
        >
          {t("cta").toUpperCase()}
        </Link>
      </div>
    </section>
  );
}
