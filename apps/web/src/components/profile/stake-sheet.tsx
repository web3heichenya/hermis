"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { useAccount, useChainId, useConfig, usePublicClient, useWriteContract } from "wagmi";

import { reputationManagerAbi } from "@/abi/reputation-manager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZERO_ADDRESS, getContractAddress } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const STAKE_DECIMALS = 18;

export function StakeSheet() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const requiredChain = getRequiredChain();
  const activeChain = config.chains.find((item) => item.id === chainId);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [phase, setPhaseInternal] = useState<"idle" | "staking" | "success" | "error">("idle");
  const stakeToastRef = useRef<string | number | null>(null);

  const updateStakePhase = useCallback(
    (
      nextPhase: "idle" | "staking" | "success" | "error",
      options?: { message?: string | null; hash?: string | null }
    ) => {
      setPhaseInternal(nextPhase);

      if (nextPhase === "idle") {
        if (stakeToastRef.current) {
          toast.dismiss(stakeToastRef.current);
          stakeToastRef.current = null;
        }
        return;
      }

      if (nextPhase === "success") {
        toast.success(t("profile.stake.success"), {
          id: stakeToastRef.current ?? undefined,
          action: options?.hash
            ? {
                label: t("submission.tx.hashLabel"),
                onClick: () => {
                  window.open(
                    getExplorerTransactionUrl(options.hash!),
                    "_blank",
                    "noopener,noreferrer"
                  );
                },
              }
            : undefined,
        });
        stakeToastRef.current = null;
        return;
      }

      if (nextPhase === "error") {
        toast.error(t("profile.stake.error", { message: options?.message ?? "Unknown error" }), {
          id: stakeToastRef.current ?? undefined,
        });
        stakeToastRef.current = null;
        return;
      }
      stakeToastRef.current = toast.loading(t("profile.stake.staking"), {
        id: stakeToastRef.current ?? undefined,
      });
    },
    [t]
  );

  const disabled = !isConnected || activeChain?.id !== requiredChain.id;
  const reputationManager = getContractAddress("REPUTATION_MANAGER") as `0x${string}`;

  const stake = async () => {
    if (disabled) return;
    if (!amount.trim()) {
      updateStakePhase("error", { message: t("profile.stake.errors.amount") });
      return;
    }
    if (!publicClient) {
      updateStakePhase("error", { message: "public client unavailable" });
      return;
    }
    try {
      updateStakePhase("staking");
      const value = parseUnits(amount, STAKE_DECIMALS);

      const stakeHash = await writeContractAsync({
        address: reputationManager,
        abi: reputationManagerAbi,
        functionName: "stake",
        args: [value, ZERO_ADDRESS],
        value,
      });
      await publicClient.waitForTransactionReceipt({ hash: stakeHash });
      updateStakePhase("success", { hash: stakeHash });
      setAmount("");
      await queryClient.invalidateQueries({
        queryKey: ["user", (address ?? "guest").toLowerCase()],
      });
    } catch (error) {
      updateStakePhase("error", { message: extractViemErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary/90 text-primary-foreground flex-1 rounded-2xl">
          {t("profile.actions.stakeMore")}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 p-6 sm:p-8">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{t("profile.stake.title")}</DialogTitle>
          <DialogDescription>{t("profile.stake.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <label className="space-y-2 text-xs">
            <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
              {t("profile.stake.amountLabel")}
            </span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
              disabled={phase === "staking"}
            />
          </label>
          <p className="text-muted-foreground/60 mt-4 text-[11px] tracking-[0.2em] uppercase">
            {disabled
              ? t("profile.stake.disabled", { network: requiredChain.name })
              : t("profile.stake.helper")}
          </p>
          <DialogFooter className="mt-6 gap-3">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground rounded-3xl"
              onClick={stake}
              disabled={disabled || !amount.trim() || phase === "staking"}
            >
              {t("profile.stake.submit")}
            </Button>
            <DialogClose asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground rounded-3xl">
                {t("common.actions.close")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UnstakeSheet() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const requiredChain = getRequiredChain();
  const activeChain = config.chains.find((item) => item.id === chainId);

  const [open, setOpen] = useState(false);
  const [phase, setPhaseInternal] = useState<"idle" | "withdrawing" | "success" | "error">("idle");
  const unstakeToastRef = useRef<string | number | null>(null);

  const updateUnstakePhase = useCallback(
    (
      nextPhase: "idle" | "withdrawing" | "success" | "error",
      options?: { message?: string | null; hash?: string | null }
    ) => {
      setPhaseInternal(nextPhase);

      if (nextPhase === "idle") {
        if (unstakeToastRef.current) {
          toast.dismiss(unstakeToastRef.current);
          unstakeToastRef.current = null;
        }
        return;
      }

      if (nextPhase === "success") {
        toast.success(t("profile.unstake.success"), {
          id: unstakeToastRef.current ?? undefined,
          action: options?.hash
            ? {
                label: t("submission.tx.hashLabel"),
                onClick: () => {
                  window.open(
                    getExplorerTransactionUrl(options.hash!),
                    "_blank",
                    "noopener,noreferrer"
                  );
                },
              }
            : undefined,
        });
        unstakeToastRef.current = null;
        return;
      }

      if (nextPhase === "error") {
        toast.error(t("profile.unstake.error", { message: options?.message ?? "Unknown error" }), {
          id: unstakeToastRef.current ?? undefined,
        });
        unstakeToastRef.current = null;
        return;
      }

      unstakeToastRef.current = toast.loading(t("profile.unstake.processing"), {
        id: unstakeToastRef.current ?? undefined,
      });
    },
    [t]
  );

  const disabled = !isConnected || activeChain?.id !== requiredChain.id;
  const reputationManager = getContractAddress("REPUTATION_MANAGER") as `0x${string}`;

  const requestUnstake = async () => {
    if (disabled) return;
    if (!publicClient) {
      updateUnstakePhase("error", { message: "public client unavailable" });
      return;
    }
    try {
      updateUnstakePhase("withdrawing");
      const hash = await writeContractAsync({
        address: reputationManager,
        abi: reputationManagerAbi,
        functionName: "requestUnstake",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      updateUnstakePhase("success", { hash });
      await queryClient.invalidateQueries({
        queryKey: ["user", (address ?? "guest").toLowerCase()],
      });
    } catch (error) {
      updateUnstakePhase("error", { message: extractViemErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="flex-1 rounded-2xl">
          {t("profile.actions.unstake")}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 p-6 sm:p-8">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{t("profile.unstake.title")}</DialogTitle>
          <DialogDescription>{t("profile.unstake.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <p className="text-muted-foreground/60 text-[11px] tracking-[0.2em] uppercase">
            {disabled
              ? t("profile.unstake.disabled", { network: requiredChain.name })
              : t("profile.unstake.helper")}
          </p>
          <DialogFooter className="mt-6 gap-3">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground rounded-3xl"
              onClick={requestUnstake}
              disabled={disabled || phase === "withdrawing"}
            >
              {t("profile.unstake.submit")}
            </Button>
            <DialogClose asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground rounded-3xl">
                {t("common.actions.close")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
