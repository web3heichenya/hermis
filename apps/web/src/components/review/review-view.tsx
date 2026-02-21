"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitReviewSheet } from "@/components/review/submit-review-sheet";
import { useReviewQueues } from "@/hooks/useReviewQueues";
import { useReviewerMetrics } from "@/hooks/useReviewerMetrics";
import { loadState, saveState } from "@/lib/storage";
import { formatTokenAmount } from "@/lib/token";
import type { SubmissionStatus } from "@/types/hermis";

const localeMap = {
  zh: zhCN,
  en: enUS,
};

export function ReviewView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;

  const { address } = useAccount();
  const isWalletConnected = !!address;

  const [filter, setFilter] = useState(() => loadState<string>(REVIEW_FILTER_STORAGE_KEY, "ALL"));
  const filterConfig = useMemo(
    () => REVIEW_FILTERS.find((item) => item.key === filter) ?? REVIEW_FILTERS[0],
    [filter]
  );

  const { reviewQueues: queues, isLoading, isError } = useReviewQueues(20, filterConfig.statuses);
  const {
    data: reviewerMetrics,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useReviewerMetrics();
  const metrics = reviewerMetrics ?? {
    totalReviews: 0,
    concludedReviews: 0,
    accurateReviews: 0,
    accuracyRate: 0,
    disputesDefended: 0,
    queuedRewards: [],
  };
  const accuracyValue = `${metrics.accuracyRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
  const disputesValue = metrics.disputesDefended.toLocaleString();
  const rewardsValue = formatRewardDisplay(metrics.queuedRewards);
  const accuracyDisplay = resolveMetricDisplay({
    connected: isWalletConnected,
    loading: metricsLoading,
    value: accuracyValue,
  });
  const disputesDisplay = resolveMetricDisplay({
    connected: isWalletConnected,
    loading: metricsLoading,
    value: disputesValue,
  });
  const queuedRewardsDisplay = resolveMetricDisplay({
    connected: isWalletConnected,
    loading: metricsLoading,
    value: rewardsValue,
  });

  const metricsHintClass =
    metricsError && !metricsLoading && isWalletConnected
      ? "text-destructive"
      : "text-muted-foreground/80";
  const statusLabelMap: Record<string, string> = {
    SUBMITTED: "common.status.submitted",
    UNDER_REVIEW: "common.status.underReview",
    NORMAL: "common.status.normal",
  };

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-lg">
        <h2 className="text-foreground text-xl font-semibold">{t("review.title")}</h2>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("review.subtitle")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("review.metrics.accuracy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">{accuracyDisplay}</p>
            <p className={`${metricsHintClass} text-xs`}>{t("review.metrics.accuracyHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("review.metrics.disputes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">{disputesDisplay}</p>
            <p className={`${metricsHintClass} text-xs`}>{t("review.metrics.disputesHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm">
              {t("review.metrics.rewards")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-3xl font-semibold">{queuedRewardsDisplay}</p>
            <p className={`${metricsHintClass} text-xs`}>{t("review.metrics.rewardsHint")}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader className="flex flex-col gap-4 pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-foreground text-base">{t("review.queues")}</CardTitle>
              <p className="text-muted-foreground text-xs">{t("review.queueSubtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs md:justify-end">
              {REVIEW_FILTERS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setFilter(item.key);
                    saveState(REVIEW_FILTER_STORAGE_KEY, item.key);
                  }}
                  className={`rounded-3xl px-4 py-2 tracking-[0.18em] uppercase transition ${
                    filterConfig.key === item.key
                      ? "bg-primary/80 text-primary-foreground"
                      : "border-border/40 bg-background/40 text-muted-foreground hover:border-primary/40 border"
                  }`}
                >
                  {t(`review.filters.${item.key.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <div className="border-border/40 text-muted-foreground/70 rounded-3xl border border-dashed px-4 py-6 text-center text-xs">
                {t("common.loading")}
              </div>
            )}
            {isError && (
              <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-3xl border px-4 py-6 text-center text-xs">
                {t("review.tx.error", { message: "Unable to load queues" })}
              </div>
            )}
            {!isLoading && !isError && queues.length === 0 && (
              <div className="border-border/40 text-muted-foreground/70 rounded-3xl border border-dashed px-4 py-6 text-center text-xs">
                {t("common.empty.noTasks")}
              </div>
            )}
            {!isLoading && !isError && queues.length > 0 && (
              <div className="grid gap-3 lg:grid-cols-2">
                {queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="border-border/40 bg-background/30 hover:border-primary/50 flex h-full items-center justify-between rounded-3xl border px-4 py-3 text-sm transition hover:-translate-y-1"
                  >
                    <div className="pr-3">
                      <p className="text-foreground font-medium">{queue.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {queue.guard && queue.guard.length
                          ? queue.guard
                          : t("review.sheet.guardChecklist")}{" "}
                        · {queue.author}
                      </p>
                    </div>
                    <div className="text-muted-foreground text-right text-xs">
                      <p>
                        {formatDistanceToNow(new Date(queue.deadline), {
                          locale: dateLocale,
                          addSuffix: true,
                        })}
                      </p>
                      <p className="mt-1 tracking-[0.24em] uppercase">
                        {t(statusLabelMap[queue.status] ?? queue.status)}
                      </p>
                      <SubmitReviewSheet queue={queue} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function formatRewardDisplay(entries: Array<{ symbol: string; amount: number }>) {
  if (!entries.length) {
    return "0";
  }
  return entries.map((entry) => formatTokenAmount(entry.amount, entry.symbol)).join(" · ");
}

function resolveMetricDisplay({
  connected,
  loading,
  value,
}: {
  connected: boolean;
  loading: boolean;
  value: string;
}) {
  if (!connected) return "—";
  if (loading) return "…";
  return value;
}

const REVIEW_FILTER_STORAGE_KEY = "review-filter";

const REVIEW_FILTERS: Array<{ key: string; statuses: SubmissionStatus[] }> = [
  { key: "ALL", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "SUBMITTED", statuses: ["SUBMITTED"] },
  { key: "UNDER_REVIEW", statuses: ["UNDER_REVIEW"] },
];
