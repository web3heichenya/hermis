"use client";

import { AllowlistConsole } from "@/components/console/allowlist-console";
import { useTranslation } from "react-i18next";

export default function ConsolePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <header className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-lg">
        <h1 className="text-foreground text-2xl font-semibold">{t("console.title")}</h1>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("console.subtitle")}</p>
      </header>
      <AllowlistConsole />
    </div>
  );
}
