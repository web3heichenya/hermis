"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { AnimatedLine } from "@/components/charts/animated-line";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokenAmount } from "@/lib/token";
import { useHermisStore } from "@/store/hermis-store";
import { useTasksData } from "@/hooks/useTasksData";
import { useGlobalStats } from "@/hooks/useGlobalStats";
import { getExplorerUrl } from "@/config/network";
import { formatAddress } from "@/lib/wallet";
import type { Task } from "@/types/hermis";

export function MarketView() {
  const { t } = useTranslation();
  const tasks = useHermisStore((state) => state.tasks);

  // hydrate trending tasks + stats
  useTasksData(12);
  const { global, daily, isLoading: statsLoading, isError: statsError } = useGlobalStats();

  const highlightedTasks = tasks.slice(0, 3);

  const rewardTrend = daily?.map((day) => day.totalRewardsDistributed) ?? [];
  const totalRewards = global?.totalRewardsDistributed ?? 0;
  const totalFees = global?.totalFeesCollected ?? 0;
  const adoptionRate = computeAdoptionRate(daily);
  const guardHeatmap = buildGuardHeatmap(tasks);
  const rewardFlow = buildRewardFlow(totalRewards, totalFees);
  const categoryLeaders = buildCategoryLeaderboard(tasks);
  const adoptionRateDisplay = statsLoading ? "…" : statsError ? "—" : `${adoptionRate}%`;

  const statusLabelMap: Record<string, string> = {
    ACTIVE: "common.status.active",
    PUBLISHED: "common.status.published",
    COMPLETED: "common.status.completed",
  };

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-lg">
        <h2 className="text-foreground text-xl font-semibold">{t("market.title")}</h2>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("market.subtitle")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("market.trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <SkeletonBlock label={t("common.loading")} />
            ) : statsError ? (
              <ErrorBlock message={t("review.tx.error", { message: "stats" })} />
            ) : (
              <AnimatedLine values={rewardTrend.length ? rewardTrend : [0]} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("market.guardHeatmap")}</CardTitle>
          </CardHeader>
          <CardContent>
            {guardHeatmap.length ? (
              <div className="text-muted-foreground grid grid-cols-2 gap-2 text-[11px] tracking-[0.2em] uppercase sm:grid-cols-3">
                {guardHeatmap.map((cell) => (
                  <div
                    key={cell.label}
                    className="border-border/40 bg-background/40 rounded-2xl border px-3 py-3 text-center"
                  >
                    <p className="text-primary text-sm font-semibold">{cell.count}</p>
                    <p className="text-muted-foreground/80 mt-1 text-[10px]">{cell.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <SkeletonBlock label={t("market.heatmapEmpty")} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("market.rewardDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-xs">
            <MetricBar
              label={t("market.metrics.totalRewards")}
              value={totalRewards}
              max={Math.max(totalRewards, totalFees, 1)}
              tone="primary"
            />
            <MetricBar
              label={t("market.metrics.totalFees")}
              value={totalFees}
              max={Math.max(totalRewards, totalFees, 1)}
              tone="secondary"
            />
            <div className="border-border/40 bg-background/40 rounded-3xl border px-4 py-3">
              <p className="text-muted-foreground/70 text-[11px] tracking-[0.2em] uppercase">
                {t("market.metrics.adoptionRate")}
              </p>
              <p className="text-foreground mt-2 text-lg font-semibold">{adoptionRateDisplay}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("market.trendingTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {highlightedTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="border-border/40 bg-background/30 hover:border-primary/60 flex h-full items-center justify-between rounded-3xl border px-4 py-3 text-sm transition hover:-translate-y-1"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-foreground font-medium">{task.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatTokenAmount(task.reward, task.token)}
                  </p>
                  {task.publisher?.address && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        window.open(
                          getExplorerUrl(task.publisher!.address),
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      className="text-muted-foreground/70 hover:text-primary mt-1 inline-block text-[11px] transition"
                    >
                      {t("market.publisher", { address: formatAddress(task.publisher.address) })}
                    </button>
                  )}
                </div>
                <span className="text-muted-foreground/70 text-xs tracking-[0.24em] uppercase">
                  {t(statusLabelMap[task.status] ?? task.status)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.2fr_1fr]">
        <RewardSankeyCard flow={rewardFlow} title={t("market.flow.title")} t={t} />
        <CategoryLeaderboardCard
          title={t("market.categoryLeaderboard.title")}
          description={t("market.categoryLeaderboard.subtitle")}
          leaders={categoryLeaders}
          t={t}
        />
      </section>
    </div>
  );
}

function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="border-border/40 bg-background/40 text-muted-foreground rounded-3xl border px-4 py-6 text-center text-xs">
      {label}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-3xl border px-4 py-6 text-center text-xs">
      {message}
    </div>
  );
}

function computeAdoptionRate(
  daily: Array<{ submissionsCreated?: number; submissionsAdopted?: number }>
) {
  if (!daily.length) return 0;
  const totalCreated = daily.reduce((sum, day) => sum + (day.submissionsCreated ?? 0), 0);
  const totalAdopted = daily.reduce((sum, day) => sum + (day.submissionsAdopted ?? 0), 0);
  if (!totalCreated) return 0;
  return Math.min(100, Math.round((totalAdopted / totalCreated) * 100));
}

function buildGuardHeatmap(tasks: Task[]) {
  const counts = new Map<string, number>();
  tasks.forEach((task) => {
    task.guardTags?.forEach((tag) => {
      if (!tag) return;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
}

function buildRewardFlow(totalRewards: number, totalFees: number) {
  const total = Math.max(totalRewards + totalFees, 1);
  const contributorShare = totalRewards / total;
  const reviewerShare = totalFees / total;
  return {
    totalRewards,
    totalFees,
    contributorShare,
    reviewerShare,
  };
}

function buildCategoryLeaderboard(tasks: Task[]) {
  const aggregates = new Map<string, { reward: number; count: number }>();
  tasks.forEach((task) => {
    const key = task.category || "Other";
    const current = aggregates.get(key) ?? { reward: 0, count: 0 };
    aggregates.set(key, {
      reward: current.reward + task.reward,
      count: current.count + 1,
    });
  });

  return Array.from(aggregates.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.reward - a.reward)
    .slice(0, 5);
}

function MetricBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "primary" | "secondary";
}) {
  const width = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const toneClass = tone === "primary" ? "bg-primary/60" : "bg-muted-foreground/40";
  return (
    <div>
      <p className="text-muted-foreground/70 text-[11px] tracking-[0.2em] uppercase">{label}</p>
      <div className="bg-background/40 mt-2 h-2 rounded-full">
        <div className={`h-2 rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
      </div>
      <p className="text-muted-foreground/70 mt-1 text-xs">{formatTokenAmount(value)}</p>
    </div>
  );
}

type RewardFlow = ReturnType<typeof buildRewardFlow>;

function RewardSankeyCard({
  flow,
  title,
  t,
}: {
  flow: RewardFlow;
  title: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const contributorPercent = Math.round(flow.contributorShare * 100);
  const reviewerPercent = Math.max(0, Math.min(100, 100 - contributorPercent));
  const contributorWidth = `${contributorPercent}%`;
  const reviewerWidth = `${reviewerPercent}%`;
  return (
    <Card className="border-border/40 bg-card/85 border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">{t("market.flow.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          <span
            className="bg-primary/90 text-primary-foreground flex items-center justify-center text-[10px]"
            style={{ width: contributorWidth }}
          >
            {contributorPercent}%
          </span>
          <span
            className="bg-secondary/80 text-secondary-foreground flex items-center justify-center text-[10px]"
            style={{ width: reviewerWidth }}
          >
            {reviewerPercent}%
          </span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase">
              {t("market.flow.contributors")}
            </p>
            <p className="text-foreground mt-1 text-sm font-semibold">
              {formatTokenAmount(flow.totalRewards)} · {contributorPercent}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-[0.2em] uppercase">{t("market.flow.reviewers")}</p>
            <p className="text-foreground mt-1 text-sm font-semibold">
              {formatTokenAmount(flow.totalFees)} · {reviewerPercent}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type CategoryLeaderboardCardProps = {
  title: string;
  description: string;
  leaders: Array<{ category: string; reward: number; count: number }>;
  t: ReturnType<typeof useTranslation>["t"];
};

function CategoryLeaderboardCard({ title, description, leaders, t }: CategoryLeaderboardCardProps) {
  return (
    <Card className="border-border/40 bg-card/85 border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {leaders.map((entry, index) => (
          <div
            key={entry.category}
            className="border-border/40 bg-background/30 flex items-center justify-between rounded-3xl border px-4 py-3"
          >
            <div>
              <p className="text-foreground font-semibold">
                {index + 1}. {entry.category}
              </p>
              <p className="text-muted-foreground text-[11px] tracking-[0.2em] uppercase">
                {t("market.categoryLeaderboard.count", { value: entry.count })}
              </p>
            </div>
            <p className="text-primary text-sm font-semibold">{formatTokenAmount(entry.reward)}</p>
          </div>
        ))}
        {!leaders.length && <SkeletonBlock label={t("market.categoryLeaderboard.empty")} />}
      </CardContent>
    </Card>
  );
}
