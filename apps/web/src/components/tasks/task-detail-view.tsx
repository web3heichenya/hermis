"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useRouter } from "@bprogress/next/app";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExplorerUrl } from "@/config/network";
import { getContractAddress } from "@/config/contracts";
import { formatAddress } from "@/lib/wallet";
import { formatTokenAmount } from "@/lib/token";
import { SubmitWorkSheet } from "@/components/tasks/submit-work-sheet";
import { RequestArbitrationSheet } from "@/components/arbitration/request-arbitration-sheet";
import { useGuardConfig } from "@/hooks/use-guard-config";
import { useStrategyConfig } from "@/hooks/useStrategyConfig";
import type { Submission, Task } from "@/types/hermis";
import { getAdoptionStrategyFallback } from "@/config/strategy-defaults";

const statusClasses: Record<string, string> = {
  DRAFT: "bg-muted/40 text-muted-foreground",
  PUBLISHED: "bg-primary/15 text-primary",
  ACTIVE: "bg-emerald-500/10 text-emerald-300",
  COMPLETED: "bg-slate-500/10 text-slate-200",
  EXPIRED: "bg-orange-500/15 text-orange-300",
  CANCELLED: "bg-red-500/15 text-red-300",
  SUBMITTED: "bg-primary/10 text-primary",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-300",
  NORMAL: "bg-muted/30 text-muted-foreground",
  ADOPTED: "bg-emerald-500/15 text-emerald-300",
  REMOVED: "bg-red-500/20 text-red-300",
};

const localeMap = {
  zh: zhCN,
  en: enUS,
};

const statusTranslationMap: Record<string, string> = {
  SUBMITTED: "common.status.submitted",
  UNDER_REVIEW: "common.status.underReview",
  NORMAL: "common.status.normal",
  ADOPTED: "common.status.adopted",
  REMOVED: "common.status.removed",
};

type TaskDetailViewProps = {
  task: Task;
};

export function TaskDetailView({ task }: TaskDetailViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const router = useRouter();
  const dateLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;
  const deadlineDistance = formatDistanceToNow(new Date(task.deadline), {
    addSuffix: true,
    locale: dateLocale,
  });

  const submissionStats = {
    total: task.submissionCount ?? task.submissions.length,
    active:
      task.activeSubmissionCount ??
      task.submissions.filter((submission) => submission.status === "UNDER_REVIEW").length,
    adopted: task.submissions.filter((submission) => submission.status === "ADOPTED").length,
    removed: task.submissions.filter((submission) => submission.status === "REMOVED").length,
  };

  const submissionGuardQuery = useGuardConfig({
    address: task.guards.submission.address,
    type: "submission",
  });
  const reviewGuardQuery = useGuardConfig({
    address: task.guards.review.address,
    type: "review",
  });

  const strategyAddress =
    task.adoptionStrategyAddress ?? getContractAddress("SIMPLE_ADOPTION_STRATEGY");
  const strategyQuery = useStrategyConfig(strategyAddress);
  const strategyFallback = getAdoptionStrategyFallback(strategyAddress);
  const strategyConfig = strategyQuery.data ?? strategyFallback;
  const strategyLoading = strategyQuery.isLoading;
  const strategyError = strategyQuery.error?.message ?? null;

  const submissionGuard = useMemo(
    () => ({
      ...task.guards.submission,
      ...(submissionGuardQuery.config ?? {}),
    }),
    [task.guards.submission, submissionGuardQuery.config]
  );

  const reviewGuard = useMemo(
    () => ({
      ...task.guards.review,
      ...(reviewGuardQuery.config ?? {}),
    }),
    [task.guards.review, reviewGuardQuery.config]
  );

  const submissionGuardSummary = useMemo(
    () => buildGuardDetails("submission", submissionGuard, t),
    [submissionGuard, t]
  );

  const strategyMetrics = useMemo(() => {
    const minReviews = strategyConfig?.minReviews ?? task.adoptionStrategy.minReviews ?? 0;
    const approvalThreshold =
      strategyConfig?.approvalThreshold ?? task.adoptionStrategy.approvalThreshold ?? 0;
    const rejectionThreshold =
      strategyConfig?.rejectionThreshold ?? task.adoptionStrategy.rejectionThreshold ?? 0;
    const approvalsRequired = computeThresholdCount(minReviews, approvalThreshold);
    const rejectionsRequired = computeThresholdCount(minReviews, rejectionThreshold);
    const expirationHours = strategyConfig?.expirationHours ?? 0;
    const allowTimeBasedAdoption =
      strategyConfig?.allowTimeBasedAdoption ??
      task.adoptionStrategy.allowTimeBasedAdoption ??
      false;
    let autoAdoptAfterHours: number | null = null;
    if (allowTimeBasedAdoption) {
      autoAdoptAfterHours =
        strategyConfig?.autoAdoptionHours ?? task.adoptionStrategy.autoAdoptAfterHours ?? null;
    }

    return {
      minReviews,
      approvalThreshold,
      approvalsRequired,
      rejectionThreshold,
      rejectionsRequired,
      expirationHours,
      allowTimeBasedAdoption,
      autoAdoptAfterHours,
    };
  }, [strategyConfig, task.adoptionStrategy]);

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-background/95 rounded-[28px] border p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,320px)] lg:items-start">
          <div className="space-y-4">
            <span
              className={`inline-flex rounded-2xl px-4 py-1 text-xs tracking-[0.26em] uppercase ${statusClasses[task.status]}`}
            >
              {t(`common.status.${task.status.toLowerCase()}`)}
            </span>
            <h1 className="text-foreground text-2xl font-semibold">{task.title}</h1>
            <p className="text-muted-foreground text-sm">
              {task.description || t("tasks.subtitle")} · {deadlineDistance}
            </p>
            <div className="text-muted-foreground/80 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.26em] uppercase">
              <span className="bg-background/40 rounded-2xl px-3 py-1">{task.category}</span>
              {task.publisher?.address && (
                <a
                  href={getExplorerUrl(task.publisher.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-background/40 text-primary hover:text-primary/80 rounded-2xl px-3 py-1 transition"
                >
                  {formatAddress(task.publisher.address)}
                </a>
              )}
            </div>
            {!!task.guardTags?.length && (
              <div className="text-muted-foreground/80 flex flex-wrap gap-2 text-[11px] tracking-[0.26em] uppercase">
                {task.guardTags.map((tag) => (
                  <span key={tag} className="bg-background/40 rounded-2xl px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="border-border/30 bg-background/80 rounded-3xl border p-5 text-right">
            <p className="text-muted-foreground/80 text-sm">{t("task.detail.rewardLabel")}</p>
            <p className="text-primary mt-2 text-4xl font-semibold">
              {formatTokenAmount(task.reward, task.token)}
            </p>
            {task.rewardTokenAddress && (
              <a
                href={getExplorerUrl(task.rewardTokenAddress)}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground/70 hover:text-primary mt-2 block text-[11px] tracking-[0.26em] uppercase transition"
              >
                {formatAddress(task.rewardTokenAddress)}
              </a>
            )}
            <p className="text-muted-foreground/70 mt-4 text-xs">
              {t("task.detail.deadlineLabel")} {new Date(task.deadline).toLocaleString(locale)}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-3 text-xs">
          <SubmitWorkSheet
            taskId={task.id}
            guardSummary={submissionGuardSummary}
            guardAddress={submissionGuard.address}
            onSubmitted={() => router.refresh()}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/30 bg-background/95 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("task.detail.requirements")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <p>{task.requirements || t("task.detail.requirementsEmpty")}</p>
          </CardContent>
        </Card>
        <GuardCard
          title={t("task.submissionGuard")}
          type="submission"
          guard={submissionGuard}
          loading={submissionGuardQuery.isLoading}
          error={submissionGuardQuery.error}
        />
        <GuardCard
          title={t("task.reviewGuard")}
          type="review"
          guard={reviewGuard}
          loading={reviewGuardQuery.isLoading}
          error={reviewGuardQuery.error}
        />
      </section>

      <section>
        <Card className="border-border/30 bg-background/95 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-foreground text-base">{t("task.strategy")}</CardTitle>
              <p className="text-muted-foreground text-xs">{t("task.detail.meta")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(strategyLoading || strategyError || (!strategyQuery.data && strategyFallback)) && (
              <p className="text-muted-foreground/70 text-xs">
                {strategyLoading
                  ? t("task.detail.strategyLoading")
                  : strategyError
                    ? t("task.detail.strategyError", { message: strategyError })
                    : t("task.detail.strategyFallback")}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StrategyMetric
                label={t("task.detail.minReviews")}
                value={strategyMetrics.minReviews.toString()}
              />
              <StrategyMetric
                label={t("task.detail.adoptRatio")}
                value={`${strategyMetrics.approvalThreshold}%`}
                hint={t("task.detail.strategyApprovalSummary", {
                  threshold: strategyMetrics.approvalThreshold,
                  count: strategyMetrics.approvalsRequired,
                })}
              />
              {strategyMetrics.rejectionThreshold > 0 && (
                <StrategyMetric
                  label={t("task.detail.rejectionRatio")}
                  value={`${strategyMetrics.rejectionThreshold}%`}
                  hint={t("task.detail.strategyRejectionSummary", {
                    threshold: strategyMetrics.rejectionThreshold,
                    count: strategyMetrics.rejectionsRequired,
                  })}
                />
              )}
              {strategyMetrics.expirationHours > 0 && (
                <StrategyMetric
                  label={t("task.detail.expirationLabel")}
                  value={`${strategyMetrics.expirationHours}h`}
                  hint={t("task.detail.strategyExpirationSummary", {
                    hours: strategyMetrics.expirationHours,
                  })}
                />
              )}
            </div>
            <p className="text-muted-foreground/70 text-xs">
              {strategyMetrics.allowTimeBasedAdoption && strategyMetrics.autoAdoptAfterHours
                ? t("task.detail.strategyAutoEnabled", {
                    hours: strategyMetrics.autoAdoptAfterHours,
                  })
                : t("task.detail.strategyAutoDisabled")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/30 bg-background/95 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-foreground text-base">{t("task.stats")}</CardTitle>
              <p className="text-muted-foreground text-xs">{t("task.detail.meta")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatPill label={t("task.detail.statsTotal")} value={submissionStats.total} />
              <StatPill label={t("task.detail.statsActive")} value={submissionStats.active} />
              <StatPill label={t("task.detail.statsAdopted")} value={submissionStats.adopted} />
              <StatPill label={t("task.detail.statsRemoved")} value={submissionStats.removed} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/30 bg-background/95 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("task.submissions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.submissions.map((submission) => (
              <SubmissionRow key={submission.id} submission={submission} />
            ))}

            {!task.submissions.length && (
              <div className="border-border/40 text-muted-foreground/80 rounded-3xl border border-dashed px-4 py-6 text-center text-sm">
                {t("common.empty.noSubmissions")}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type GuardCardProps = {
  title: string;
  guard: Task["guards"]["submission"];
  type: "submission" | "review";
  loading?: boolean;
  error?: string | null;
};

function GuardCard({ title, guard, type, loading, error }: GuardCardProps) {
  const { t } = useTranslation();
  const items = buildGuardDetails(type, guard, t);
  const showOpen = !loading && !error && items.length === 0;
  const guardAddress = guard.address;
  return (
    <Card className="border-border/30 bg-background/95 h-full border shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-2 text-sm">
        <div className="text-xs">
          <p className="text-muted-foreground/70 tracking-[0.24em] uppercase">
            {t("task.guard.addressLabel")}
          </p>
          {guardAddress ? (
            <a
              href={getExplorerUrl(guardAddress)}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 transition"
            >
              {formatAddress(guardAddress)}
            </a>
          ) : (
            <p className="text-muted-foreground/70">{t("task.guard.none")}</p>
          )}
        </div>
        {loading && <p>{t("task.guard.loading")}</p>}
        {error && !loading && <p>{t("task.guard.error", { message: error })}</p>}
        {!loading && !error && items.map((item) => <p key={item}>• {item}</p>)}
        {showOpen && <p>{t("task.guard.open")}</p>}
      </CardContent>
    </Card>
  );
}

type StrategyMetricProps = {
  label: string;
  value: string;
  hint?: string;
};

function StrategyMetric({ label, value, hint }: StrategyMetricProps) {
  return (
    <div className="border-border/30 bg-background/80 rounded-3xl border px-4 py-3 text-sm shadow-sm">
      <p className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-foreground mt-2 text-xl font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground/70 mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function buildGuardDetails(
  type: "submission" | "review",
  guard: Task["guards"]["submission"],
  translate: (key: string, values?: Record<string, string | number | Date>) => string
) {
  const items: string[] = [];
  if (guard.minReputation) {
    items.push(
      translate("task.guard.reputation", {
        value: formatGuardNumber(guard.minReputation),
      })
    );
  }
  if (guard.stakeRequired) {
    items.push(translate("task.guard.stake", { value: guard.stakeRequired }));
  }
  if (guard.categories && guard.categories.length) {
    items.push(translate("task.guard.categories", { categories: guard.categories.join(", ") }));
  }
  if (guard.allowList && guard.allowList.length) {
    items.push(translate("task.guard.allowlist", { addresses: guard.allowList.join(", ") }));
  }
  if (guard.minCategoryScore) {
    items.push(
      translate("task.guard.categoryScore", {
        value: formatGuardNumber(guard.minCategoryScore),
      })
    );
  }
  if (guard.requiredCategory) {
    items.push(translate("task.guard.requiredCategory", { category: guard.requiredCategory }));
  }
  if (type === "submission") {
    if (guard.maxFailedSubmissions !== undefined) {
      items.push(
        translate("task.guard.maxFailedSubmissions", { count: guard.maxFailedSubmissions })
      );
    }
    if (guard.minSuccessRate !== undefined) {
      items.push(translate("task.guard.minSuccessRate", { value: guard.minSuccessRate }));
    }
  } else {
    if (guard.minReviewCount !== undefined) {
      items.push(translate("task.guard.minReviewCount", { count: guard.minReviewCount }));
    }
    if (guard.minAccuracyRate !== undefined) {
      items.push(translate("task.guard.minAccuracyRate", { value: guard.minAccuracyRate }));
    }
  }
  return items;
}

function computeThresholdCount(minReviews: number, threshold: number): number {
  if (minReviews <= 0 || threshold <= 0) {
    return 0;
  }
  return Math.min(minReviews, Math.max(1, Math.ceil((threshold / 100) * minReviews)));
}

function formatGuardNumber(value: number) {
  if (!Number.isFinite(value)) return String(value);
  const fractionDigits = Number.isInteger(value) ? 0 : 1;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type StatPillProps = {
  label: string;
  value: number;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="border-border/30 bg-background/80 rounded-3xl border px-5 py-4 text-sm shadow-sm">
      <p className="text-muted-foreground/70 text-xs tracking-[0.26em] uppercase">{label}</p>
      <p className="text-foreground mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

type SubmissionRowProps = {
  submission: Submission;
};

function SubmissionRow({ submission }: SubmissionRowProps) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const isOwner =
    !!address && submission.author
      ? address.toLowerCase() === submission.author.toLowerCase()
      : false;
  const canArbitrate = isOwner && submission.status !== "ADOPTED";
  const arbitrationSubmissionId = submission.contractId || submission.id;
  return (
    <div className="border-border/30 bg-background/95 hover:border-primary/60 flex items-center justify-between rounded-3xl border px-4 py-3 text-sm shadow-sm transition hover:-translate-y-1">
      <div>
        <p className="text-foreground font-medium">
          {submission.author} · v{submission.version}
        </p>
        <p className="text-muted-foreground text-xs">{submission.summary}</p>
      </div>
      <div className="space-y-2 text-right">
        <span
          className={`inline-flex rounded-2xl px-3 py-1 text-[11px] tracking-[0.24em] uppercase ${statusClasses[submission.status]}`}
        >
          {t(statusTranslationMap[submission.status] ?? submission.status)}
        </span>
        <p className="text-muted-foreground/70 text-xs">
          {t("submission.voteSummary", {
            approvals: submission.approveCount,
            rejections: submission.rejectCount,
          })}
        </p>
        {canArbitrate && (
          <RequestArbitrationSheet
            submissionId={arbitrationSubmissionId}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary rounded-2xl px-3 py-1 text-[11px]"
              >
                {t("arbitration.sheet.trigger")}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
