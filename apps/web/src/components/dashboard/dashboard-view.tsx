"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { AnimatedLine } from "@/components/charts/animated-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalStats } from "@/hooks/useGlobalStats";
import { useTasksData } from "@/hooks/useTasksData";
import { useReviewQueues } from "@/hooks/useReviewQueues";
import { formatTokenAmount } from "@/lib/token";

const localeMap: Record<string, typeof zhCN> = {
  zh: zhCN,
  en: enUS,
};

export function DashboardView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = localeMap[locale] ?? enUS;

  const { global, daily, isLoading: statsLoading, isError: statsError } = useGlobalStats();
  const { tasks, isLoading: tasksLoading } = useTasksData(6);
  const { reviewQueues, isLoading: reviewLoading } = useReviewQueues(4);

  const activitySeries = useMemo(() => {
    if (statsLoading || statsError || !daily.length) {
      return [0];
    }
    return daily.map((stat) => stat.totalRewardsDistributed ?? 0);
  }, [daily, statsError, statsLoading]);

  const summaryCards = useMemo(
    () => [
      {
        key: "totalTasks",
        label: t("dashboard.metrics.totalTasks"),
        value: global?.totalTasks ?? 0,
      },
      {
        key: "totalSubmissions",
        label: t("dashboard.metrics.totalSubmissions"),
        value: global?.totalSubmissions ?? 0,
      },
      {
        key: "totalUsers",
        label: t("dashboard.metrics.totalUsers"),
        value: global?.totalUsers ?? 0,
      },
      {
        key: "activeTasks",
        label: t("dashboard.metrics.activeTasks"),
        value: global?.activeTasks ?? 0,
      },
      {
        key: "pendingArbitrations",
        label: t("dashboard.metrics.pendingArbitrations"),
        value: global?.pendingArbitrations ?? 0,
      },
      {
        key: "totalRewards",
        label: t("dashboard.metrics.totalRewards"),
        value: global?.totalRewardsDistributed ?? 0,
        format: (value: number) => formatTokenAmount(value),
      },
    ],
    [global, t]
  );

  const shortcuts = useMemo(
    () => [
      { label: t("dashboard.shortcuts.createTask"), icon: "icon-plus", href: "/tasks/create" },
      { label: t("dashboard.shortcuts.claimRewards"), icon: "icon-market", href: "/profile" },
      { label: t("dashboard.shortcuts.submitAppeal"), icon: "icon-review", href: "/arbitration" },
    ],
    [t]
  );

  const statusLabelMap: Record<string, string> = {
    SUBMITTED: "common.status.submitted",
    UNDER_REVIEW: "common.status.underReview",
    NORMAL: "common.status.normal",
  };

  return (
    <div className="space-y-6">
      <section className="bg-card/80 shadow-primary/10 rounded-[32px] border border-white/5 p-6 shadow-lg">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((item) => (
            <Card key={item.key} className="border-border/50 bg-card/70 border backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground text-3xl font-semibold">
                  {item.format ? item.format(item.value) : item.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border-border/50 bg-background/40 mt-8 rounded-[28px] border p-4 lg:p-6">
          <AnimatedLine values={activitySeries} />
          <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
            <span>
              {daily[0]?.timestamp
                ? format(new Date(daily[0].timestamp * 1000), "PP", { locale: dateLocale })
                : ""}
            </span>
            <span>
              {daily.at(-1)?.timestamp
                ? format(new Date(daily.at(-1)!.timestamp * 1000), "PP", { locale: dateLocale })
                : ""}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/40 bg-card/80 border backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-foreground text-base">
              {t("dashboard.shortcutsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {shortcuts.map((action) => (
              <Button
                key={action.label}
                variant="secondary"
                asChild
                className="group border-border/40 bg-background/30 h-24 flex-col rounded-3xl border text-sm shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Link href={action.href}>
                  <svg className="text-primary size-6 group-hover:scale-110" aria-hidden>
                    <use href={`#${action.icon}`} />
                  </svg>
                  <span className="text-muted-foreground group-hover:text-primary mt-2 text-xs">
                    {action.label}
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 border backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-foreground text-base">
              {t("dashboard.activity.tasksTitle")}
            </CardTitle>
            <Button variant="ghost" className="text-xs tracking-[0.24em] uppercase" asChild>
              <Link href="/tasks">{t("dashboard.activity.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksLoading && (
              <div className="border-border/40 bg-background/40 text-muted-foreground rounded-3xl border px-4 py-6 text-sm">
                {t("common.loading")}
              </div>
            )}
            {!tasksLoading && !tasks.length && (
              <div className="border-border/40 text-muted-foreground/80 rounded-3xl border border-dashed px-4 py-6 text-center text-sm">
                {t("dashboard.activity.emptyTasks")}
              </div>
            )}
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="border-border/40 bg-background/30 hover:border-primary/60 flex items-center justify-between rounded-3xl border px-4 py-3 text-sm transition hover:-translate-y-1"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-foreground truncate font-medium">{task.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {task.category ?? t("dashboard.activity.uncategorized")}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-muted-foreground/70 tracking-[0.24em] uppercase">
                    {t(`common.status.${task.status.toLowerCase()}`)}
                  </p>
                  <p className="text-primary mt-1">{formatTokenAmount(task.reward, task.token)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/85 border backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-foreground text-base">{t("review.queues")}</CardTitle>
              <p className="text-muted-foreground text-xs">{t("dashboard.reviewQueuesSubtitle")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewLoading && (
              <div className="border-border/40 bg-background/30 text-muted-foreground rounded-3xl border px-4 py-6 text-sm">
                {t("common.loading")}
              </div>
            )}
            {!reviewLoading && !reviewQueues.length && (
              <div className="border-border/40 text-muted-foreground/80 rounded-3xl border border-dashed px-4 py-6 text-center text-sm">
                {t("dashboard.reviewQueuesEmpty")}
              </div>
            )}
            {reviewQueues.slice(0, 4).map((queue) => (
              <div
                key={queue.id}
                className="border-border/40 bg-background/30 hover:border-primary/60 flex items-center justify-between rounded-3xl border px-4 py-3 text-sm transition hover:-translate-y-1"
              >
                <div>
                  <p className="text-foreground font-medium">{queue.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {queue.guard || t("dashboard.reviewQueuesNoGuard")}
                  </p>
                </div>
                <div className="text-muted-foreground text-right text-xs">
                  <p>{format(new Date(queue.deadline), "MM-dd HH:mm", { locale: dateLocale })}</p>
                  <p className="mt-1 tracking-[0.24em] uppercase">
                    {t(statusLabelMap[queue.status] ?? queue.status)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
