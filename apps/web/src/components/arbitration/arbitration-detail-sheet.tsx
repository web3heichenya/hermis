"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ArbitrationCase } from "@/types/hermis";
import { formatTokenAmount } from "@/lib/token";

const localeMap = {
  zh: zhCN,
  en: enUS,
};

type ArbitrationDetailSheetProps = {
  arbitrationCase: ArbitrationCase;
  trigger: React.ReactNode;
};

export function ArbitrationDetailSheet({ arbitrationCase, trigger }: ArbitrationDetailSheetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const dateLocale = localeMap[locale as keyof typeof localeMap] ?? enUS;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const filedDate = useMemo(
    () => format(new Date(arbitrationCase.filedAt), "PPpp", { locale: dateLocale }),
    [arbitrationCase.filedAt, dateLocale]
  );
  const filedAgo = useMemo(
    () =>
      formatDistanceToNow(new Date(arbitrationCase.filedAt), {
        locale: dateLocale,
        addSuffix: true,
      }),
    [arbitrationCase.filedAt, dateLocale]
  );

  const resolvedInfo = useMemo(() => {
    if (!arbitrationCase.resolvedAt) return null;
    return format(new Date(arbitrationCase.resolvedAt), "PPpp", { locale: dateLocale });
  }, [arbitrationCase.resolvedAt, dateLocale]);

  const typeLabel = arbitrationCase.typeKey
    ? t(`arbitration.types.${arbitrationCase.typeKey}`, {
        default: humanizeType(arbitrationCase.typeKey ?? ""),
      })
    : arbitrationCase.type;

  const handleCopy = async () => {
    if (!arbitrationCase.evidence) return;
    try {
      await navigator.clipboard.writeText(arbitrationCase.evidence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 rounded-[32px] border p-8">
        <DialogClose className="text-muted-foreground hover:text-foreground focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">{t("common.actions.close")}</span>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t("arbitration.detail.title", { id: arbitrationCase.id })}</DialogTitle>
          <DialogDescription>{t("arbitration.detail.subtitle", { filedAgo })}</DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label={t("arbitration.detail.status")}>
              {t(mapStatusKey(arbitrationCase.status))}
            </DetailRow>
            <DetailRow label={t("arbitration.detail.type")}>{typeLabel}</DetailRow>
            <DetailRow label={t("arbitration.detail.requester")}>
              {arbitrationCase.requester}
            </DetailRow>
            {arbitrationCase.targetId && (
              <DetailRow label={t("arbitration.detail.target")}>
                {`#${arbitrationCase.targetId}`}
              </DetailRow>
            )}
            <DetailRow label={t("arbitration.detail.filedAt")}>{filedDate}</DetailRow>
            {resolvedInfo && (
              <DetailRow label={t("arbitration.detail.resolvedAt")}>{resolvedInfo}</DetailRow>
            )}
            <DetailRow label={t("arbitration.detail.deposit")}>
              {formatTokenAmount(arbitrationCase.fee, arbitrationCase.feeTokenSymbol)}
            </DetailRow>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-muted-foreground/70 tracking-[0.2em] uppercase">
              {t("arbitration.detail.evidence")}
            </div>
            <div className="border-border/40 bg-background/40 text-foreground rounded-3xl border px-4 py-3 text-sm whitespace-pre-wrap">
              {arbitrationCase.evidence || t("arbitration.detail.evidenceEmpty")}
            </div>
            {arbitrationCase.evidence && (
              <Button size="sm" variant="ghost" className="rounded-2xl" onClick={handleCopy}>
                {copied ? t("arbitration.detail.copied") : t("arbitration.detail.copy")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-foreground text-sm">{children}</p>
    </div>
  );
}

function mapStatusKey(status: ArbitrationCase["status"]) {
  switch (status) {
    case "APPROVED":
      return "common.status.approved";
    case "REJECTED":
      return "common.status.rejected";
    case "DISMISSED":
      return "common.status.dismissed";
    case "PENDING":
    default:
      return "common.status.pending";
  }
}
function humanizeType(value: string) {
  if (!value) return "Arbitration";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
