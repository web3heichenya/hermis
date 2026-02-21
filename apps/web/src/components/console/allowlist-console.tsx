"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, useConfig, usePublicClient, useWriteContract } from "wagmi";

import { allowlistManagerAbi } from "@/abi/allowlist-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllowlistOptions } from "@/hooks/useAllowlistOptions";
import { getContractAddress } from "@/config/contracts";
import { getExplorerUrl, getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";
import { formatAddress } from "@/lib/wallet";

type SectionKey = "guards" | "strategies" | "tokens";

type PendingState = {
  type: SectionKey | null;
  target: string | null;
  action: "allow" | "disallow" | null;
  message: string | null;
};

type AllowlistItem = {
  address: string;
  label?: string;
  description?: string;
  kind?: string;
};

export function AllowlistConsole() {
  const { t } = useTranslation();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const requiredChain = getRequiredChain();
  const activeChain = config.chains.find((item) => item.id === chainId);
  const allowlistManager = getContractAddress("ALLOWLIST_MANAGER") as `0x${string}`;

  const [inputs, setInputs] = useState({ guard: "", strategy: "", token: "" });
  const [pending, setPending] = useState<PendingState>({
    type: null,
    target: null,
    action: null,
    message: null,
  });

  const allowlistQuery = useAllowlistOptions();
  const allowlistData = allowlistQuery.data;

  const strategyOptions = allowlistData?.strategies ?? [];
  const tokenOptions = allowlistData?.tokens ?? [];

  const disabled = !isConnected || activeChain?.id !== requiredChain.id;

  const guardItems = useMemo<AllowlistItem[]>(() => {
    const submissionGuards = allowlistData?.submissionGuards ?? [];
    const reviewGuards = allowlistData?.reviewGuards ?? [];
    const combined = [...submissionGuards, ...reviewGuards];
    const map = new Map<string, AllowlistItem>();
    combined.forEach((guard) => {
      if (!map.has(guard.address)) {
        map.set(guard.address, {
          address: guard.address,
          label: guard.label,
          description: guard.description,
          kind: guard.kind,
        });
      }
    });
    return Array.from(map.values());
  }, [allowlistData?.submissionGuards, allowlistData?.reviewGuards]);

  const highlightPending = (type: SectionKey, target: string, action: "allow" | "disallow") => {
    setPending({ type, target: target.toLowerCase(), action, message: null });
  };

  const resetPending = () => {
    setPending({ type: null, target: null, action: null, message: null });
  };

  const invalidateAllowlist = async () => {
    await queryClient.invalidateQueries({ queryKey: ["allowlist-options"] });
  };

  const waitForReceipt = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
  };

  const handleError = (error: unknown) => {
    setPending((prev) => ({ ...prev, message: extractViemErrorMessage(error) }));
  };

  const onAllow = async (type: SectionKey, value: string) => {
    const target = value.trim().toLowerCase();
    if (!target) return;
    highlightPending(type, target, "allow");
    try {
      const fn =
        type === "guards" ? "allowGuard" : type === "strategies" ? "allowStrategy" : "allowToken";
      const hash = await writeContractAsync({
        address: allowlistManager,
        abi: allowlistManagerAbi,
        functionName: fn,
        args: [target as `0x${string}`],
      });
      await waitForReceipt(hash);
      await invalidateAllowlist();
      setInputs((prev) => ({
        ...prev,
        [type === "guards" ? "guard" : type === "strategies" ? "strategy" : "token"]: "",
      }));
      resetPending();
    } catch (error) {
      handleError(error);
    }
  };

  const onDisallow = async (type: SectionKey, address: string) => {
    highlightPending(type, address, "disallow");
    try {
      const fn =
        type === "guards"
          ? "disallowGuard"
          : type === "strategies"
            ? "disallowStrategy"
            : "disallowToken";
      const hash = await writeContractAsync({
        address: allowlistManager,
        abi: allowlistManagerAbi,
        functionName: fn,
        args: [address as `0x${string}`],
      });
      await waitForReceipt(hash);
      await invalidateAllowlist();
      resetPending();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-lg lg:p-8">
        <h1 className="text-foreground text-2xl font-semibold">{t("console.allowlist.title")}</h1>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("console.allowlist.subtitle")}</p>
        <p className="text-muted-foreground/60 mt-3 text-xs">
          {disabled
            ? t("console.allowlist.networkWarning", { network: requiredChain.name })
            : t("console.allowlist.helper")}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <AllowlistSection
          title={t("console.allowlist.sections.guards.title")}
          description={t("console.allowlist.sections.guards.subtitle")}
          items={guardItems}
          placeholder="0x1234..."
          inputValue={inputs.guard}
          setInputValue={(value) => setInputs((prev) => ({ ...prev, guard: value }))}
          disabled={disabled}
          isLoading={allowlistQuery.isLoading}
          pending={pending.type === "guards" ? pending : null}
          onAllow={(value) => onAllow("guards", value)}
          onDisallow={(address) => onDisallow("guards", address)}
        />
        <AllowlistSection
          title={t("console.allowlist.sections.strategies.title")}
          description={t("console.allowlist.sections.strategies.subtitle")}
          items={strategyOptions}
          placeholder="0xabcd..."
          inputValue={inputs.strategy}
          setInputValue={(value) => setInputs((prev) => ({ ...prev, strategy: value }))}
          disabled={disabled}
          isLoading={allowlistQuery.isLoading}
          pending={pending.type === "strategies" ? pending : null}
          onAllow={(value) => onAllow("strategies", value)}
          onDisallow={(address) => onDisallow("strategies", address)}
        />
        <AllowlistSection
          title={t("console.allowlist.sections.tokens.title")}
          description={t("console.allowlist.sections.tokens.subtitle")}
          items={tokenOptions.map((token) => ({
            address: token.address,
            label: token.label,
            description: token.symbol,
            kind: token.isNative ? "native" : "erc20",
          }))}
          placeholder="0xef01..."
          inputValue={inputs.token}
          setInputValue={(value) => setInputs((prev) => ({ ...prev, token: value }))}
          disabled={disabled}
          isLoading={allowlistQuery.isLoading}
          pending={pending.type === "tokens" ? pending : null}
          onAllow={(value) => onAllow("tokens", value)}
          onDisallow={(address) => onDisallow("tokens", address)}
        />
      </div>
    </div>
  );
}

type AllowlistSectionProps = {
  title: string;
  description: string;
  items: AllowlistItem[];
  placeholder: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  disabled: boolean;
  isLoading: boolean;
  pending: PendingState | null;
  onAllow: (value: string) => void;
  onDisallow: (address: string) => void;
};

function AllowlistSection({
  title,
  description,
  items,
  placeholder,
  inputValue,
  setInputValue,
  disabled,
  isLoading,
  pending,
  onAllow,
  onDisallow,
}: AllowlistSectionProps) {
  const { t } = useTranslation();

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aLabel = a.label ?? "";
      const bLabel = b.label ?? "";
      return aLabel.localeCompare(bLabel);
    });
  }, [items]);

  return (
    <Card className="border-border/40 bg-card/85 flex h-full flex-col border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4 text-sm">
        <div className="space-y-2">
          <label className="text-muted-foreground/70 text-[11px] tracking-[0.2em] uppercase">
            {t("console.allowlist.actions.addLabel")}
          </label>
          <div className="flex gap-2">
            <input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={placeholder}
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary flex-1 rounded-3xl border px-4 py-2 text-sm focus:outline-none"
              disabled={disabled || isLoading}
            />
            <Button
              size="sm"
              className="bg-primary text-primary-foreground rounded-3xl"
              onClick={() => onAllow(inputValue)}
              disabled={disabled || isLoading || !inputValue.trim()}
            >
              {t("console.allowlist.actions.allow")}
            </Button>
          </div>
          {pending?.message && pending.action === "allow" && (
            <p className="text-destructive text-xs">{pending.message}</p>
          )}
        </div>

        <div className="space-y-3">
          {isLoading && <p className="text-muted-foreground text-xs">{t("common.loading")}</p>}
          {!isLoading && sortedItems.length === 0 && (
            <div className="border-border/40 bg-background/30 text-muted-foreground rounded-3xl border px-4 py-4 text-center text-xs">
              {t("console.allowlist.empty")}
            </div>
          )}
          {sortedItems.map((item) => {
            const address = item.address.toLowerCase();
            const isPending = pending?.target === address;
            const pendingAction = isPending ? pending?.action : null;
            const label = item.label || formatAddress(address);
            return (
              <div
                key={address}
                className="border-border/40 bg-background/30 rounded-3xl border px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold" title={label}>
                      {label}
                    </p>
                    <div className="text-muted-foreground/80 flex flex-wrap items-center gap-2 text-[11px]">
                      {item.kind && (
                        <span className="tracking-[0.24em] uppercase">{item.kind}</span>
                      )}
                      <a
                        href={getExplorerUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {formatAddress(address)}
                      </a>
                      {item.description && <span className="truncate">{item.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-3xl"
                      onClick={() => onDisallow(address)}
                      disabled={disabled || isPending}
                    >
                      {pendingAction === "disallow"
                        ? t("console.allowlist.actions.pending")
                        : t("console.allowlist.actions.remove")}
                    </Button>
                  </div>
                </div>
                {isPending && pendingAction === "disallow" && pending?.message && (
                  <p className="text-destructive mt-2 text-xs">{pending.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
