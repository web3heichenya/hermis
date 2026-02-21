"use client";

import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@bprogress/next/app";

import { Button } from "@/components/ui/button";

type TaskDetailPendingProps = {
  taskId: string;
};

export function TaskDetailPending({ taskId }: TaskDetailPendingProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="text-muted-foreground mx-auto mt-12 max-w-2xl space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-primary text-xs tracking-[0.26em] uppercase">
          {t("task.detail.pendingTitle")}
        </p>
        <h1 className="text-foreground text-2xl font-semibold">
          {t("task.detail.pendingHeadline", { id: taskId })}
        </h1>
        <p className="text-muted-foreground text-sm">{t("task.detail.pendingDescription")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={handleRefresh} disabled={isRefreshing} className="rounded-2xl">
          {isRefreshing ? t("common.loading") : t("task.detail.pendingRefresh")}
        </Button>
        <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/tasks")}>
          {t("task.detail.pendingBack")}
        </Button>
      </div>
    </div>
  );
}
