"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InitializeSbtButton } from "@/components/profile/initialize-sbt-button";
import { StakeSheet, UnstakeSheet } from "@/components/profile/stake-sheet";
import { useHermisStore } from "@/store/hermis-store";
import { formatAddress } from "@/lib/wallet";
import { isProjectOwner } from "@/config/admins";
import { useSbtStatus } from "@/hooks/use-sbt-status";

export function ProfileView() {
  const user = useHermisStore((state) => state.user);
  const { t } = useTranslation();
  const { address } = useAccount();
  const ownerCandidate = address ?? user.address;
  const showAdminTools = isProjectOwner(ownerCandidate);

  const sbtStatus = useSbtStatus(user.address);
  const displayStatus = sbtStatus.status;
  const hasSbt = sbtStatus.hasSbt;
  const canInitializeSbt = !sbtStatus.isLoading && !hasSbt && !!user.address;

  const sbtReputation = hasSbt ? Number(sbtStatus.reputation) / 10 : null;
  const displayedReputation = sbtReputation ?? user.reputation;

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-lg">
        <div>
          <h2 className="text-foreground text-xl font-semibold">{t("profile.title")}</h2>
          <p className="text-muted-foreground/80 mt-2 text-sm">{t("profile.subtitle")}</p>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="bg-background/40 rounded-2xl px-3 py-1 tracking-[0.26em] uppercase">
              {formatAddress(user.address) || t("wallet.connect")}
            </span>
            {displayStatus !== "UNINITIALIZED" && (
              <span className="bg-primary/10 text-primary rounded-2xl px-3 py-1">
                {t(`profile.states.${displayStatus}`)}
              </span>
            )}
            {canInitializeSbt && (
              <InitializeSbtButton
                addressToInitialize={user.address}
                className="bg-primary text-primary-foreground"
                onInitialized={() => sbtStatus.refetch()}
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("profile.sections.reputation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <div className="bg-background/30 flex items-center justify-between rounded-3xl px-4 py-3">
              <span className="tracking-[0.26em] uppercase">{t("profile.sections.score")}</span>
              <span className="text-foreground text-2xl font-semibold">
                {Number.isFinite(displayedReputation)
                  ? displayedReputation.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "—"}
              </span>
            </div>
            <div className="bg-background/30 flex items-center justify-between rounded-3xl px-4 py-3">
              <span className="tracking-[0.26em] uppercase">{t("profile.sections.sbt")}</span>
              <span className="text-primary text-lg font-semibold">
                {hasSbt ? t("profile.states.NORMAL") : t("profile.states.UNINITIALIZED")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("profile.sections.stake")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <div className="bg-background/30 rounded-3xl px-4 py-3">
              <p className="text-muted-foreground/70 text-xs tracking-[0.26em] uppercase">
                {t("profile.sections.staked")}
              </p>
              <p className="text-foreground mt-2 text-2xl font-semibold">{user.stake} ETH</p>
            </div>
            <div className="flex gap-2">
              <StakeSheet />
              <UnstakeSheet />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 bg-card/85 border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t("profile.sections.categories")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            {user.categoryScores.length ? (
              user.categoryScores.map((score) => (
                <div
                  key={score.label}
                  className="bg-background/30 flex items-center justify-between rounded-3xl px-4 py-3"
                >
                  <span>{score.label}</span>
                  <span className="text-foreground text-lg font-semibold">{score.value}</span>
                </div>
              ))
            ) : (
              <div className="border-border/40 bg-background/30 text-muted-foreground/70 rounded-3xl border border-dashed px-4 py-5 text-center text-xs tracking-[0.2em] uppercase">
                {t("profile.categoriesEmpty")}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {showAdminTools && (
        <section>
          <Card className="border-border/40 bg-card/85 border">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-foreground text-base">
                  {t("profile.sections.admin")}
                </CardTitle>
                <p className="text-muted-foreground text-xs">{t("console.subtitle")}</p>
              </div>
              <Button asChild size="sm" className="bg-primary text-primary-foreground rounded-3xl">
                <Link href="/console" className="text-primary-foreground">
                  {t("profile.actions.openConsole")}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>{t("console.allowlist.subtitle")}</p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
