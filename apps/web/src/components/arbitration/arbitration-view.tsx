"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArbitrationDetailSheet } from "@/components/arbitration/arbitration-detail-sheet";
import { useArbitrations } from "@/hooks/useArbitrations";
import { formatTokenAmount } from "@/lib/token";
import type { ArbitrationStatus } from "@/types/hermis";

const localeMap = {
  zh: zhCN,
  en: enUS,
};

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "DISMISSED"] as const;

export function ArbitrationView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const statusParam = useMemo<ArbitrationStatus[] | undefined>(
    () => (statusFilter === "ALL" ? undefined : [statusFilter as ArbitrationStatus]),
    [statusFilter]
  );

  const { cases, isLoading, isFetching, isError, error, refetch } = useArbitrations({
    statuses: statusParam,
  });

  const statusLabelMap: Record<string, string> = {
    PENDING: "common.status.pending",
    APPROVED: "common.status.approved",
    REJECTED: "common.status.rejected",
    DISMISSED: "common.status.dismissed",
  };

  const typeFilters = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((item) => {
      if (item.typeKey) {
        set.add(item.typeKey);
      }
    });
    return Array.from(set).sort();
  }, [cases]);

  useEffect(() => {
    if (typeFilter !== "ALL" && !typeFilters.includes(typeFilter)) {
      setTypeFilter("ALL");
    }
  }, [typeFilters, typeFilter]);

  const filteredCases = useMemo(() => {
    if (typeFilter === "ALL") return cases;
    return cases.filter((item) => item.typeKey === typeFilter);
  }, [cases, typeFilter]);

  const pendingCount = useMemo(
    () => filteredCases.filter((item) => item.status === "PENDING").length,
    [filteredCases]
  );
  const totalFees = useMemo(
    () => filteredCases.reduce((acc, item) => acc + item.fee, 0),
    [filteredCases]
  );

  const loading = isLoading || isFetching;
  const hasCases = filteredCases.length > 0;

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[32px] border p-6 shadow-lg">
        <h1 className="text-foreground text-2xl font-semibold">{t("arbitration.title")}</h1>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("arbitration.subtitle")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("arbitration.metrics.open")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">{pendingCount}</p>
            <p className="text-muted-foreground/80 text-xs">{t("arbitration.metrics.openHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("arbitration.metrics.fees")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">
              {formatTokenAmount(totalFees, "USDC")}
            </p>
            <p className="text-muted-foreground/80 text-xs">{t("arbitration.metrics.feesHint")}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader className="flex flex-col gap-4 pb-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-foreground text-base">
              {t("arbitration.queueTitle")}
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => refetch()}
              disabled={loading}
            >
              {loading ? t("common.loading") : t("common.actions.refresh")}
            </Button>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={statusFilter === item ? "secondary" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setStatusFilter(item)}
                  disabled={loading && statusFilter === item}
                >
                  {item === "ALL" ? t("arbitration.filters.allStatuses") : t(statusLabelMap[item])}
                </Button>
              ))}
              {typeFilters.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant={typeFilter === "ALL" ? "secondary" : "outline"}
                    className="rounded-2xl"
                    onClick={() => setTypeFilter("ALL")}
                    disabled={loading && typeFilter === "ALL"}
                  >
                    {t("arbitration.filters.allTypes")}
                  </Button>
                  {typeFilters.map((item) => (
                    <Button
                      key={item}
                      size="sm"
                      variant={typeFilter === item ? "secondary" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setTypeFilter(item)}
                      disabled={loading && typeFilter === item}
                    >
                      {t(`arbitration.types.${item}`, { default: formatArbitrationType(item) })}
                    </Button>
                  ))}
                </>
              )}
            </div>

            {isError && (
              <div className="border-border/40 text-destructive rounded-3xl border px-4 py-3 text-xs tracking-[0.18em] uppercase">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {loading && !hasCases && (
              <div className="border-border/40 text-muted-foreground rounded-3xl border px-4 py-3 text-sm">
                {t("common.loading")}
              </div>
            )}

            {!loading && !isError && !hasCases && (
              <div className="border-border/40 text-muted-foreground/80 rounded-3xl border border-dashed px-4 py-6 text-center text-sm">
                {t("arbitration.empty")}
              </div>
            )}

            {!loading && !isError && hasCases && (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredCases.map((item) => {
                  const typeLabel = item.typeKey
                    ? t(`arbitration.types.${item.typeKey}`, {
                        default: formatArbitrationType(item.typeKey),
                      })
                    : item.type;

                  return (
                    <div
                      key={item.id}
                      className="border-border/40 bg-background/30 hover:border-primary/60 h-full rounded-3xl border px-4 py-3 transition hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="pr-2">
                          <p className="text-foreground font-medium">{typeLabel}</p>
                          <p className="text-muted-foreground/70 text-xs">{item.summary}</p>
                        </div>
                        <div className="text-muted-foreground text-right text-xs">
                          <p>
                            {formatDistanceToNow(new Date(item.filedAt), {
                              locale: dateLocale,
                              addSuffix: true,
                            })}
                          </p>
                          <span className="bg-background/40 text-muted-foreground/70 mt-2 inline-flex rounded-2xl px-3 py-1 tracking-[0.24em] uppercase">
                            {t(statusLabelMap[item.status] ?? item.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-muted-foreground/70 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>{t("arbitration.requester", { requester: item.requester })}</span>
                        <span>
                          {t("arbitration.fee", {
                            amount: formatTokenAmount(item.fee, item.feeTokenSymbol),
                          })}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <ArbitrationDetailSheet
                          arbitrationCase={item}
                          trigger={
                            <Button size="sm" variant="ghost" className="rounded-2xl">
                              {t("arbitration.detail.trigger")}
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function formatArbitrationType(value: string) {
  if (!value) return "Arbitration";
  switch (value) {
    case "USER_REPUTATION":
      return "User reputation";
    case "SUBMISSION_STATUS":
      return "Submission appeal";
    default:
      return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}
