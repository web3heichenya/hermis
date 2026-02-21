"use client";

import { format, formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useRouter } from "@bprogress/next/app";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditSubmissionSheet } from "@/components/tasks/edit-submission-sheet";
import { RequestArbitrationSheet } from "@/components/arbitration/request-arbitration-sheet";
import type { Submission, Task } from "@/types/hermis";

const localeMap = {
  zh: zhCN,
  en: enUS,
};

type SubmissionDetailViewProps = {
  task: Task;
  submission: Submission;
};

export function SubmissionDetailView({ task, submission }: SubmissionDetailViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const router = useRouter();
  const { address } = useAccount();
  const dateLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;
  const submittedAt = new Date(submission.submittedAt);
  const statusLabelMap: Record<string, string> = {
    SUBMITTED: "common.status.submitted",
    UNDER_REVIEW: "common.status.underReview",
    NORMAL: "common.status.normal",
    ADOPTED: "common.status.adopted",
    REMOVED: "common.status.removed",
  };

  const timeline = [
    {
      label: t("submission.timeline.submitted"),
      time: format(submittedAt, "PPpp", { locale: dateLocale }),
    },
    {
      label: t("submission.timeline.latestReview"),
      time: formatDistanceToNow(submittedAt, { locale: dateLocale, addSuffix: true }),
    },
    {
      label: t("submission.timeline.guardCheck"),
      time: t("submission.timeline.guardPassed"),
    },
  ];

  const isAuthor = address?.toLowerCase() === submission.author.toLowerCase();
  const isEditable = isAuthor && submission.status !== "ADOPTED" && submission.status !== "REMOVED";
  const canArbitrate = isAuthor && submission.status !== "ADOPTED";

  return (
    <div className="space-y-6">
      <section className="border-border/40 bg-card/85 rounded-[32px] border p-6 shadow-lg">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <span className="bg-primary/15 text-primary inline-flex rounded-2xl px-4 py-1 text-xs tracking-[0.26em] uppercase">
              {task.title}
            </span>
            <h1 className="text-foreground text-2xl font-semibold">
              {t("submission.heading", { id: submission.id })}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("submission.submittedBy", { author: submission.author })}
            </p>
          </div>
          <div className="border-border/40 bg-background/30 rounded-3xl border p-5 text-right">
            <div className="flex flex-col items-end gap-2">
              <span className="bg-background/40 text-muted-foreground inline-flex rounded-2xl px-3 py-1 text-[11px] tracking-[0.24em] uppercase">
                {t(statusLabelMap[submission.status] ?? submission.status)}
              </span>
              <p className="text-muted-foreground/70 text-xs">
                {t("submission.timeAgo", {
                  distance: formatDistanceToNow(submittedAt, {
                    locale: dateLocale,
                    addSuffix: true,
                  }),
                })}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {canArbitrate && (
                <RequestArbitrationSheet
                  submissionId={submission.contractId || submission.id}
                  trigger={
                    <Button size="sm" variant="outline" className="rounded-2xl">
                      {t("arbitration.sheet.trigger")}
                    </Button>
                  }
                  onRequested={() => router.refresh()}
                />
              )}
              {isEditable && (
                <EditSubmissionSheet
                  submission={submission}
                  guardAddress={task.guards.submission.address}
                  onUpdated={() => router.refresh()}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("submission.summaryTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <p>{submission.summary}</p>
            <div className="bg-background/30 rounded-3xl px-4 py-3">
              <p className="text-muted-foreground/70 text-xs tracking-[0.26em] uppercase">
                {t("submission.version")}
              </p>
              <p className="text-foreground mt-2 text-lg font-semibold">v{submission.version}</p>
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{t("submission.approvals", { count: submission.approveCount })}</span>
              <span>{t("submission.rejections", { count: submission.rejectCount })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("submission.timelineTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            {timeline.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="bg-background/30 flex items-center justify-between rounded-3xl px-4 py-3"
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground/70 text-xs">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/80 border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-foreground text-base">
                {t("submission.attachmentsTitle")}
              </CardTitle>
              <p className="text-muted-foreground text-xs">{t("submission.attachmentsHint")}</p>
            </div>
            <Button size="sm" variant="secondary" className="rounded-2xl">
              {t("submission.downloadAll")}
            </Button>
          </CardHeader>
          <CardContent className="text-muted-foreground grid gap-2 text-sm md:grid-cols-2">
            {Array.from({ length: submission.attachments }).map((_, index) => (
              <div
                key={index}
                className="border-border/40 bg-background/30 flex items-center justify-between rounded-3xl border px-4 py-3"
              >
                <span>{t("submission.attachmentLabel", { index: index + 1 })}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary rounded-2xl"
                >
                  {t("submission.viewFile")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
