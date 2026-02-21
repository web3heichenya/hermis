"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, useConfig, usePublicClient, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { reputationManagerAbi } from "@/abi/reputation-manager";
import { getContractAddress } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InitializeSbtButtonProps = {
  addressToInitialize?: string | null;
  className?: string;
  onInitialized?: () => void;
};

export function InitializeSbtButton({
  addressToInitialize,
  className,
  onInitialized,
}: InitializeSbtButtonProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const requiredChain = getRequiredChain();
  const activeChain = config.chains.find((network) => network.id === chainId);

  const targetAddress = (addressToInitialize || address) as `0x${string}` | undefined;
  const [isPending, setIsPending] = useState(false);
  const toastRef = useRef<string | number | null>(null);

  const reputationManager = getContractAddress("REPUTATION_MANAGER") as `0x${string}`;

  const handleClick = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!targetAddress) {
      toast.error(t("profile.initialize.error", { message: "Missing address" }));
      return;
    }

    if (address?.toLowerCase() !== targetAddress.toLowerCase()) {
      toast.error(t("profile.initialize.accountMismatch"));
      return;
    }

    if (activeChain && activeChain.id !== requiredChain.id) {
      toast.error(t("profile.initialize.network", { network: requiredChain.name }));
      return;
    }

    if (!publicClient) {
      toast.error(t("profile.initialize.error", { message: "Public client unavailable" }));
      return;
    }

    try {
      setIsPending(true);
      toastRef.current = toast.loading(t("profile.initialize.pending"));

      const hash = await writeContractAsync({
        address: reputationManager,
        abi: reputationManagerAbi,
        functionName: "initializeUser",
        args: [targetAddress],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      toast.success(t("profile.initialize.success"), {
        id: toastRef.current ?? undefined,
        action: {
          label: t("submission.tx.hashLabel"),
          onClick: () => {
            window.open(getExplorerTransactionUrl(hash), "_blank", "noopener,noreferrer");
          },
        },
      });
      toastRef.current = null;

      const queryKeyAddress = (targetAddress ?? address ?? "guest").toLowerCase();
      await queryClient.invalidateQueries({ queryKey: ["user", queryKeyAddress] });
      onInitialized?.();
    } catch (error) {
      toast.error(t("profile.initialize.error", { message: extractViemErrorMessage(error) }), {
        id: toastRef.current ?? undefined,
      });
      toastRef.current = null;
    } finally {
      setIsPending(false);
    }
  };

  if (!targetAddress) {
    return null;
  }

  const wrongNetwork = activeChain ? activeChain.id !== requiredChain.id : false;
  const accountMismatch =
    isConnected && targetAddress && address
      ? address.toLowerCase() !== targetAddress.toLowerCase()
      : false;
  const disabled = isPending || wrongNetwork || accountMismatch;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "bg-primary/10 text-primary rounded-2xl px-3 py-1 text-[11px] font-semibold tracking-[0.26em] uppercase transition disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {isPending ? t("profile.initialize.submitting") : t("profile.actions.initializeSbt")}
    </button>
  );
}
