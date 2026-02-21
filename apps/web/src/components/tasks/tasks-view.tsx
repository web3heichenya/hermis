"use client";

import { format, formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GuardConfigurator } from "@/components/tasks/guard-configurator";
import { useHermisStore } from "@/store/hermis-store";
import { useTasksData } from "@/hooks/useTasksData";
import { getExplorerUrl } from "@/config/network";
import { formatAddress } from "@/lib/wallet";
import { formatTokenAmount } from "@/lib/token";
import type { Task } from "@/types/hermis";

const statusChips: Task["status"][] = [
  "DRAFT",
  "PUBLISHED",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
];

const dateLocaleMap = {
  zh: zhCN,
  en: enUS,
};

export function TasksView() {
  const filters = useHermisStore((state) => state.filters);
  const setSearch = useHermisStore((state) => state.setSearch);
  const setFilter = useHermisStore((state) => state.setFilter);
  const resetFilters = useHermisStore((state) => state.resetFilters);
  const { tasks, isLoading } = useTasksData();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = dateLocaleMap[locale as keyof typeof dateLocaleMap] ?? enUS;

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = filters.search
      ? task.title.toLowerCase().includes(filters.search.toLowerCase())
      : true;
    const matchesStatus = filters.status ? task.status === filters.status : true;
    const matchesCategory = filters.category ? task.category === filters.category : true;
    const matchesGuard = filters.guard
      ? task.guardTags.some((tag) => tag.toLowerCase().includes(filters.guard!.toLowerCase()))
      : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesGuard;
  });

  return (
    <div className="space-y-6">
      <div className="border-border/30 bg-card/80 shadow-primary/5 rounded-[28px] border p-6 shadow-lg">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">{t("tasks.title")}</h2>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("tasks.subtitle")}</p>

        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={filters.search}
              onChange={(event) => setSearch(event.target.value)}
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/70 focus:border-primary w-full flex-1 rounded-3xl border px-4 py-3 text-sm focus:outline-none"
              placeholder={t("tasks.filters.searchPlaceholder")}
            />
            <Button variant="secondary" className="rounded-3xl sm:w-auto" onClick={resetFilters}>
              {t("common.actions.reset")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {statusChips.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter("status", filters.status === status ? null : status)}
                  className={`rounded-2xl px-4 py-2 text-xs tracking-[0.2em] uppercase transition ${
                    filters.status === status
                      ? "bg-primary/20 text-primary"
                      : "bg-background/40 text-muted-foreground hover:bg-background/55"
                  }`}
                >
                  {t(`common.status.${status.toLowerCase()}`)}
                </button>
              ))}
            </div>
            <GuardConfigurator />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {isLoading && (
          <div className="border-border/40 bg-card/60 text-muted-foreground/80 rounded-[28px] border p-10 text-center text-sm md:col-span-2 xl:col-span-3">
            {t("common.loading")}
          </div>
        )}
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} dateLocale={dateLocale} />
        ))}

        {!isLoading && !filteredTasks.length && (
          <div className="border-border/40 bg-card/40 text-muted-foreground/80 rounded-[28px] border border-dashed p-10 text-center text-sm md:col-span-2 xl:col-span-3">
            {t("common.empty.noTasks")}
          </div>
        )}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  dateLocale: Locale;
};

type Locale = typeof zhCN;

function TaskCard({ task, dateLocale }: TaskCardProps) {
  const { t } = useTranslation();
  const now = new Date();
  const deadline = new Date(task.deadline);
  const distance = formatDistanceToNow(deadline, { locale: dateLocale, addSuffix: true });
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link href={`/tasks/${task.id}`} className="block h-full">
      <Card className="border-border/40 bg-card/85 relative h-full overflow-hidden rounded-[32px] border transition hover:-translate-y-1 hover:shadow-2xl">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
          <div className="from-primary/20 to-primary/10 text-primary flex w-full flex-1 flex-col items-center justify-center rounded-3xl bg-gradient-to-b text-center sm:w-20 sm:flex-none">
            <span className="text-primary/70 text-[11px] tracking-[0.24em] uppercase">
              {t("common.labels.due")}
            </span>
            <span className="mt-2 text-4xl font-semibold">{daysLeft}</span>
            <span className="text-primary/70 text-[11px] tracking-[0.26em] uppercase">
              {t("common.labels.days")}
            </span>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-muted-foreground/70 text-xs tracking-[0.3em] uppercase">
                  {task.category}
                </p>
                <h3 className="text-foreground mt-1 text-lg font-semibold">{task.title}</h3>
                {task.description && (
                  <p className="text-muted-foreground/80 mt-1 line-clamp-2 text-xs">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[11px] tracking-[0.26em] uppercase">
                  {t(`common.status.${task.status.toLowerCase()}`)}
                </span>
                <p className="text-primary mt-1 text-sm">
                  {formatTokenAmount(task.reward, task.token)}
                </p>
              </div>
            </div>

            <div className="text-muted-foreground/80 flex flex-wrap gap-2 text-[11px] tracking-[0.28em] uppercase">
              {task.guardTags.map((tag) => (
                <span key={tag} className="bg-background/40 rounded-2xl px-3 py-1">
                  {tag}
                </span>
              ))}
              {task.publisher?.address && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const url = getExplorerUrl(task.publisher!.address);
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="bg-background/40 text-primary hover:text-primary/80 rounded-2xl px-3 py-1 transition"
                >
                  {formatAddress(task.publisher.address)}
                </button>
              )}
            </div>

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {t("common.labels.deadline")}{" "}
                {format(deadline, "MM-dd HH:mm", { locale: dateLocale })}
              </span>
              <span>{distance}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
