"use client";

import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedLine } from "@/components/charts/animated-line";

const guardHitRates = [72, 74, 79, 81, 85, 88];

export function AnalyticsView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[32px] border p-6 shadow-lg">
        <h1 className="text-foreground text-2xl font-semibold">{t("analytics.title")}</h1>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("analytics.subtitle")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("analytics.metrics.totalFunds")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">
              {t("analytics.metrics.totalFundsValue")}
            </p>
            <p className="text-muted-foreground/80 text-xs">{t("analytics.metrics.totalHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("analytics.metrics.guardHit")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">
              {t("analytics.metrics.guardHitValue")}
            </p>
            <p className="text-muted-foreground/80 text-xs">{t("analytics.metrics.guardHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("analytics.metrics.adoption")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">
              {t("analytics.metrics.adoptionValue")}
            </p>
            <p className="text-muted-foreground/80 text-xs">
              {t("analytics.metrics.adoptionHint")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("analytics.trend.guard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="lg:p-6">
            <AnimatedLine values={guardHitRates} />
            <p className="text-muted-foreground mt-3 text-xs">{t("analytics.trend.guardHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("analytics.breakdown.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm lg:p-6">
            {["research", "creative", "review"].map((key) => (
              <div
                key={key}
                className="bg-background/30 flex items-center justify-between rounded-3xl px-4 py-3"
              >
                <span>{t(`analytics.breakdown.${key}.label`)}</span>
                <span className="text-foreground">{t(`analytics.breakdown.${key}.value`)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
