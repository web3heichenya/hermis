"use client";

import { useState } from "react";
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
} from "@/components/ui/dialog";

const guardPresets = [
  {
    name: "Atlas Starter",
    reputation: ">= 320",
    stake: "40 USDC",
    modules: ["Submission Guard", "Auto-expire 48h"],
  },
  {
    name: "Atlas Pro",
    reputation: ">= 540",
    stake: "120 USDC",
    modules: ["Submission Guard", "Review Guard", "Appeal buffer"],
  },
  {
    name: "Hermis Sentinel",
    reputation: ">= 720",
    stake: "200 USDC",
    modules: ["Submission Guard", "Review Guard", "Strategy oracle"],
  },
];

export function GuardConfigurator() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="secondary"
        className="border-border/40 bg-background/30 text-muted-foreground rounded-3xl border text-xs tracking-[0.24em] uppercase"
        onClick={() => setOpen(true)}
      >
        {t("guards.open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/30 bg-card/95 w-full max-w-md border p-6 sm:p-8">
          <DialogClose className="text-muted-foreground hover:text-foreground focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">{t("common.actions.close")}</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{t("guards.title")}</DialogTitle>
            <DialogDescription>{t("guards.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="text-muted-foreground mt-6 space-y-3 text-sm">
            {guardPresets.map((preset) => (
              <div
                key={preset.name}
                className="border-border/40 bg-background/30 rounded-3xl border px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-foreground font-medium">{preset.name}</p>
                  <span className="text-muted-foreground/70 text-xs">{preset.reputation}</span>
                </div>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  {t("guards.stake", { stake: preset.stake })}
                </p>
                <div className="text-muted-foreground/70 mt-3 flex flex-wrap gap-2 text-[11px] tracking-[0.24em] uppercase">
                  {preset.modules.map((module) => (
                    <span key={module} className="bg-background/40 rounded-2xl px-3 py-1">
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
