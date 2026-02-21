"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter } from "@bprogress/next/app";
import { useAccount, useChainId, useConfig, usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs, parseUnits } from "viem";
import { format, startOfToday } from "date-fns";

import { loadState, saveState, clearState } from "@/lib/storage";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { taskManagerAbi } from "@/abi/task-manager";
import { erc20Abi } from "@/abi/erc20";
import { ZERO_ADDRESS, getContractAddress, CONTRACT_ADDRESSES } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import type { TaskCreationDraft } from "@/types/hermis";
import { useAllowlistOptions } from "@/hooks/useAllowlistOptions";
import {
  evaluateStrategyConfig,
  useStrategyConfig,
  type StrategyConfig,
  type StrategyConfigIssue,
} from "@/hooks/useStrategyConfig";
import { getAdoptionStrategyFallback } from "@/config/strategy-defaults";
import { formatAddress } from "@/lib/wallet";
import { cn } from "@/lib/utils";

const steps = ["basics", "timeline", "guards", "strategy", "summary"] as const;

const CATEGORY_OPTIONS = [
  { value: "research" },
  { value: "development" },
  { value: "creative" },
  { value: "growth" },
  { value: "community" },
  { value: "operations" },
  { value: "other" },
] as const;

type StepKey = (typeof steps)[number];

type ErrorMap = Record<string, string>;

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type TokenSelectOption = {
  value: string;
  label: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
};

type BasicFieldKey = keyof Pick<
  TaskCreationDraft,
  "title" | "description" | "requirements" | "coverImage"
>;

const defaultDeadline = () => {
  const date = new Date(Date.now() + 72 * 60 * 60 * 1000);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
};

function createInitialDraft(): TaskCreationDraft {
  return {
    title: "",
    category: "",
    description: "",
    requirements: "",
    coverImage: "",
    deadline: defaultDeadline(),
    rewardAmount: "",
    rewardToken: ZERO_ADDRESS,
    submissionGuardAddress: getContractAddress("SUBMISSION_GUARD"),
    reviewGuardAddress: getContractAddress("REVIEW_GUARD"),
    adoptionStrategyAddress: getContractAddress("SIMPLE_ADOPTION_STRATEGY"),
    agreeToTerms: false,
  };
}

type TransactionPhase = "idle" | "creating" | "approving" | "publishing" | "success" | "error";

type TransactionState = {
  phase: TransactionPhase;
  taskId?: string | null;
  message?: string | null;
};

export function TaskCreationView() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();

  const draftStorageKey = useMemo(
    () => `task-draft:${(address ?? "guest").toLowerCase()}`,
    [address]
  );

  const [activeStep, setActiveStep] = useState<StepKey>("basics");
  const [form, setForm] = useState<TaskCreationDraft>(() => createInitialDraft());
  const [errors, setErrors] = useState<ErrorMap>({});
  const [txState, setTxStateInternal] = useState<TransactionState>({ phase: "idle" });
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const publishToastRef = useRef<string | number | null>(null);

  const updateTxState = useCallback(
    (next: TransactionState) => {
      setTxStateInternal(next);

      if (next.phase === "idle") {
        if (publishToastRef.current) {
          toast.dismiss(publishToastRef.current);
          publishToastRef.current = null;
        }
        return;
      }

      if (next.phase === "success") {
        toast.success(t("creation.tx.success", { taskId: next.taskId ?? "-" }), {
          id: publishToastRef.current ?? undefined,
        });
        publishToastRef.current = null;
        return;
      }

      if (next.phase === "error") {
        toast.error(t("creation.tx.error", { message: next.message ?? "Unknown error" }), {
          id: publishToastRef.current ?? undefined,
        });
        publishToastRef.current = null;
        return;
      }

      const phaseMessageKey =
        next.phase === "creating"
          ? "creation.tx.creating"
          : next.phase === "approving"
            ? "creation.tx.approving"
            : "creation.tx.publishing";

      publishToastRef.current = toast.loading(t(phaseMessageKey), {
        id: publishToastRef.current ?? undefined,
      });
    },
    [t]
  );

  const allowlistQuery = useAllowlistOptions();
  const allowlistData = allowlistQuery.data;
  const strategyConfigQuery = useStrategyConfig(form.adoptionStrategyAddress);
  const strategyConfigValue = strategyConfigQuery.data ?? null;

  const submissionGuardOptions = useMemo<SelectOption[]>(() => {
    const guards = allowlistData?.submissionGuards ?? [];
    const options: SelectOption[] = [{ value: ZERO_ADDRESS, label: ZERO_ADDRESS }];

    if (guards.length) {
      options.push(
        ...guards.map((guard) => ({
          value: guard.address,
          label: guard.label,
          description: guard.description,
        }))
      );
      return options;
    }

    const address = getContractAddress("SUBMISSION_GUARD");
    options.push({ value: address, label: formatAddress(address) });
    return options;
  }, [allowlistData?.submissionGuards]);

  const reviewGuardOptions = useMemo<SelectOption[]>(() => {
    const guards = allowlistData?.reviewGuards ?? [];
    const options: SelectOption[] = [{ value: ZERO_ADDRESS, label: ZERO_ADDRESS }];

    if (guards.length) {
      options.push(
        ...guards.map((guard) => ({
          value: guard.address,
          label: guard.label,
          description: guard.description,
        }))
      );
      return options;
    }

    const address = getContractAddress("REVIEW_GUARD");
    options.push({ value: address, label: formatAddress(address) });
    return options;
  }, [allowlistData?.reviewGuards]);

  const strategyOptions = useMemo<SelectOption[]>(() => {
    const strategies = (allowlistData?.strategies ?? []).filter(
      (strategy) => strategy.kind === "adoption"
    );

    if (strategies.length) {
      return strategies.map((strategy) => ({
        value: strategy.address,
        label: strategy.label,
        description: strategy.description,
      }));
    }

    const address = getContractAddress("SIMPLE_ADOPTION_STRATEGY");
    return [{ value: address, label: formatAddress(address) }];
  }, [allowlistData?.strategies]);

  const tokenOptions = useMemo<TokenSelectOption[]>(
    () => [
      {
        value: ZERO_ADDRESS,
        label: "ETH",
        symbol: "ETH",
        decimals: 18,
        isNative: true,
      },
    ],
    []
  );

  const requiredChain = getRequiredChain();
  const publicClient = usePublicClient({ chainId: requiredChain.id });
  const activeChain = useMemo(
    () => config.chains.find((chain) => chain.id === chainId),
    [chainId, config.chains]
  );

  const isCorrectNetwork = Boolean(activeChain && activeChain.id === requiredChain.id);
  const interactionDisabled = !isConnected || !isCorrectNetwork;

  const isPublishing =
    txState.phase === "creating" || txState.phase === "approving" || txState.phase === "publishing";
  const publishDisabled =
    interactionDisabled ||
    isPublishing ||
    txState.phase === "success" ||
    (activeStep === "summary" && !form.agreeToTerms);

  useEffect(() => {
    if (txState.phase === "success" && txState.taskId) {
      const handle = setTimeout(() => {
        router.replace(`/tasks/${txState.taskId}`);
      }, 4000);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [router, txState]);

  useEffect(() => {
    const saved = loadState<{ form: Partial<TaskCreationDraft>; step?: StepKey } | null>(
      draftStorageKey,
      null
    );
    if (saved?.form) {
      if (saved.form.deadline && saved.form.deadline.length === 16) {
        const parsed = new Date(saved.form.deadline);
        if (!Number.isNaN(parsed.getTime())) {
          saved.form.deadline = parsed.toISOString();
        }
      }
      const base = createInitialDraft();
      const merged: TaskCreationDraft = {
        ...base,
        ...saved.form,
        submissionGuardAddress: saved.form.submissionGuardAddress ?? base.submissionGuardAddress,
        reviewGuardAddress: saved.form.reviewGuardAddress ?? base.reviewGuardAddress,
        adoptionStrategyAddress: saved.form.adoptionStrategyAddress ?? base.adoptionStrategyAddress,
        rewardToken: saved.form.rewardToken ?? base.rewardToken,
      };
      setForm(merged);
      if (saved.step && steps.includes(saved.step)) {
        setActiveStep(saved.step);
      }
    }
  }, [draftStorageKey]);

  useEffect(() => {
    saveState(draftStorageKey, { form, step: activeStep });
  }, [draftStorageKey, form, activeStep]);

  useEffect(() => {
    if (!submissionGuardOptions.length) return;
    if (
      !form.submissionGuardAddress ||
      !submissionGuardOptions.some((option) => option.value === form.submissionGuardAddress)
    ) {
      setForm((prev) => ({
        ...prev,
        submissionGuardAddress: submissionGuardOptions[0].value,
      }));
    }
  }, [submissionGuardOptions, form.submissionGuardAddress]);

  useEffect(() => {
    if (!reviewGuardOptions.length) return;
    if (
      !form.reviewGuardAddress ||
      !reviewGuardOptions.some((option) => option.value === form.reviewGuardAddress)
    ) {
      setForm((prev) => ({
        ...prev,
        reviewGuardAddress: reviewGuardOptions[0].value,
      }));
    }
  }, [reviewGuardOptions, form.reviewGuardAddress]);

  useEffect(() => {
    if (!strategyOptions.length) return;
    if (
      !form.adoptionStrategyAddress ||
      !strategyOptions.some((option) => option.value === form.adoptionStrategyAddress)
    ) {
      setForm((prev) => ({
        ...prev,
        adoptionStrategyAddress: strategyOptions[0].value,
      }));
    }
  }, [strategyOptions, form.adoptionStrategyAddress]);

  useEffect(() => {
    if (!tokenOptions.length) return;
    if (!tokenOptions.some((option) => option.value === form.rewardToken)) {
      setForm((prev) => ({
        ...prev,
        rewardToken: tokenOptions[0].value,
      }));
    }
  }, [tokenOptions, form.rewardToken]);

  const stepIndex = steps.indexOf(activeStep);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyStepErrors = (step: StepKey, stepErrors: ErrorMap) => {
    setErrors((prev) => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.startsWith(`${step}.`))
      );
      return { ...filtered, ...stepErrors };
    });
  };

  const validateNumber = (value: string, positiveOnly = false) => {
    if (!value.trim()) {
      return true;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return false;
    }
    if (positiveOnly) {
      return numeric > 0;
    }
    return numeric >= 0;
  };

  const validateStep = (step: StepKey) => {
    const stepErrors: ErrorMap = {};

    if (step === "basics") {
      if (!form.title.trim()) {
        stepErrors["basics.title"] = t("creation.validation.required");
      }
      if (!form.category.trim()) {
        stepErrors["basics.category"] = t("creation.validation.required");
      }
      if (!form.description.trim()) {
        stepErrors["basics.description"] = t("creation.validation.required");
      }
      if (!form.requirements.trim()) {
        stepErrors["basics.requirements"] = t("creation.validation.required");
      }
    }

    if (step === "timeline") {
      if (!form.deadline) {
        stepErrors["timeline.deadline"] = t("creation.validation.required");
      } else {
        const deadlineDate = new Date(form.deadline);
        if (Number.isNaN(deadlineDate.getTime())) {
          stepErrors["timeline.deadline"] = t("creation.validation.deadline");
        } else {
          const minTime = Date.now() + 30 * 60 * 1000;
          if (deadlineDate.getTime() <= minTime) {
            stepErrors["timeline.deadline"] = t("creation.validation.deadline");
          }
        }
      }

      if (!form.rewardAmount.trim()) {
        stepErrors["timeline.rewardAmount"] = t("creation.validation.required");
      } else if (!validateNumber(form.rewardAmount, true)) {
        stepErrors["timeline.rewardAmount"] = t("creation.validation.positive");
      }

      if (!form.rewardToken.trim()) {
        stepErrors["timeline.rewardToken"] = t("creation.validation.required");
      } else if (!tokenOptions.some((option) => option.value === form.rewardToken)) {
        stepErrors["timeline.rewardToken"] = t("creation.validation.tokenUnknown");
      }
    }

    if (step === "guards") {
      if (!form.submissionGuardAddress) {
        stepErrors["guards.submission.address"] = t("creation.validation.required");
      } else if (
        !submissionGuardOptions.some((option) => option.value === form.submissionGuardAddress)
      ) {
        stepErrors["guards.submission.address"] = t("creation.validation.guardUnknown");
      }
      if (!form.reviewGuardAddress) {
        stepErrors["guards.review.address"] = t("creation.validation.required");
      } else if (!reviewGuardOptions.some((option) => option.value === form.reviewGuardAddress)) {
        stepErrors["guards.review.address"] = t("creation.validation.guardUnknown");
      }
    }

    if (step === "strategy") {
      if (!form.adoptionStrategyAddress) {
        stepErrors["strategy.address"] = t("creation.validation.required");
      } else if (!strategyOptions.some((option) => option.value === form.adoptionStrategyAddress)) {
        stepErrors["strategy.address"] = t("creation.validation.strategyUnknown");
      } else if (strategyConfigQuery.isLoading) {
        stepErrors["strategy.config"] = t("creation.validation.strategyLoading");
      } else if (!strategyConfigValue && !fallbackStrategyConfig) {
        stepErrors["strategy.config"] = t("creation.validation.strategyMissing");
      } else if (displayStrategyIssues.length) {
        stepErrors["strategy.config"] = t("creation.validation.strategyInvalid");
      }
    }

    if (step === "summary") {
      if (!form.agreeToTerms) {
        stepErrors["summary.agree"] = t("creation.validation.required");
      }
    }

    applyStepErrors(step, stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const goToPrevious = () => {
    setActiveStep((prev) => {
      const index = steps.indexOf(prev);
      return steps[Math.max(index - 1, 0)];
    });
  };

  const goToNext = () => {
    setActiveStep((prev) => {
      const index = steps.indexOf(prev);
      return steps[Math.min(index + 1, steps.length - 1)];
    });
  };

  const handleNextAction = () => {
    if (isPublishing || txState.phase === "success") {
      return;
    }
    if (interactionDisabled) {
      return;
    }
    if (!validateStep(activeStep)) {
      return;
    }
    if (activeStep === "summary") {
      void handlePublish();
      return;
    }
    goToNext();
  };

  const handlePublish = async () => {
    if (isPublishing || txState.phase === "success") {
      return;
    }
    if (interactionDisabled) {
      return;
    }

    const orderedSteps: StepKey[] = ["basics", "timeline", "guards", "strategy", "summary"];
    for (const step of orderedSteps) {
      const valid = validateStep(step);
      if (!valid) {
        if (step !== activeStep) {
          setActiveStep(step);
        }
        return;
      }
    }

    if (!publicClient) {
      updateTxState({ phase: "error", message: "public client unavailable" });
      return;
    }

    const rewardTokenAddress = (form.rewardToken || ZERO_ADDRESS).toLowerCase();
    const rewardTokenAddressHex = rewardTokenAddress as `0x${string}`;
    let rewardAmount: bigint;
    try {
      rewardAmount = parseUnits(form.rewardAmount || "0", rewardTokenDecimals);
    } catch (error) {
      updateTxState({ phase: "error", message: extractErrorMessage(error) });
      return;
    }

    const deadlineSeconds = Math.floor(new Date(form.deadline).getTime() / 1000);
    const taskManagerAddress = getContractAddress("TASK_MANAGER") as `0x${string}`;
    const submissionGuardAddress = (
      form.submissionGuardAddress || getContractAddress("SUBMISSION_GUARD")
    ).toLowerCase() as `0x${string}`;
    const reviewGuardAddress = (
      form.reviewGuardAddress || getContractAddress("REVIEW_GUARD")
    ).toLowerCase() as `0x${string}`;
    const adoptionStrategyAddress = (
      form.adoptionStrategyAddress || getContractAddress("SIMPLE_ADOPTION_STRATEGY")
    ).toLowerCase() as `0x${string}`;

    setActiveStep("summary");
    setTxHashes([]);
    updateTxState({ phase: "creating" });

    try {
      const createHash = await writeContractAsync({
        address: taskManagerAddress,
        abi: taskManagerAbi,
        functionName: "createTask",
        args: [
          form.title,
          form.description,
          form.requirements,
          form.category,
          BigInt(deadlineSeconds),
          rewardAmount,
          rewardTokenAddressHex,
          submissionGuardAddress,
          reviewGuardAddress,
          adoptionStrategyAddress,
        ],
      });

      setTxHashes([createHash]);

      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
      const createdEvents = parseEventLogs({
        abi: taskManagerAbi,
        logs: createReceipt.logs,
        eventName: "TaskCreated",
      });

      const newTaskId = createdEvents[0]?.args?.taskId;
      if (!newTaskId) {
        throw new Error("TaskCreated event not found");
      }

      const taskIdBigInt = BigInt(newTaskId);
      const rewardIsNative = rewardTokenIsNative;

      if (!rewardIsNative) {
        if (!address) {
          throw new Error("Wallet address unavailable");
        }

        const currentAllowance = (await publicClient.readContract({
          address: rewardTokenAddressHex,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, taskManagerAddress],
        })) as bigint;

        if (currentAllowance < rewardAmount) {
          updateTxState({ phase: "approving" });
          const approveHash = await writeContractAsync({
            address: rewardTokenAddressHex,
            abi: erc20Abi,
            functionName: "approve",
            args: [taskManagerAddress, rewardAmount],
          });
          setTxHashes((prev) => [...prev, approveHash]);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      updateTxState({ phase: "publishing" });

      const publishHash = await writeContractAsync({
        address: taskManagerAddress,
        abi: taskManagerAbi,
        functionName: "publishTask",
        args: [taskIdBigInt],
        value: rewardIsNative ? rewardAmount : 0n,
      });

      setTxHashes((prev) => [...prev, publishHash]);
      await publicClient.waitForTransactionReceipt({ hash: publishHash });

      updateTxState({ phase: "success", taskId: taskIdBigInt.toString() });
      clearState(draftStorageKey);
      const nextDraft = createInitialDraft();
      setForm(nextDraft);
      setActiveStep("basics");
      saveState(draftStorageKey, { form: nextDraft, step: "basics" });
    } catch (error) {
      updateTxState({ phase: "error", message: extractErrorMessage(error) });
    }
  };

  const handleReset = () => {
    const nextDraft = createInitialDraft();
    setForm(nextDraft);
    setErrors({});
    updateTxState({ phase: "idle" });
    setTxHashes([]);
    setActiveStep("basics");
    clearState(draftStorageKey);
    saveState(draftStorageKey, { form: nextDraft, step: "basics" });
  };

  const handleBasicChange = (key: BasicFieldKey) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      clearError(`basics.${key}`);
    };
  };

  const handleCategoryChange = (value: string) => {
    setForm((prev) => ({ ...prev, category: value }));
    clearError("basics.category");
  };

  const handleRewardTokenChange = (value: string) => {
    setForm((prev) => ({ ...prev, rewardToken: value }));
    clearError("timeline.rewardToken");
  };

  const handleDeadlineDateChange = (date?: Date) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(23, 59, 0, 0);
    setForm((prev) => ({ ...prev, deadline: next.toISOString() }));
    clearError("timeline.deadline");
  };

  const selectedToken = useMemo(() => {
    return tokenOptions.find((item) => item.value === form.rewardToken) ?? null;
  }, [tokenOptions, form.rewardToken]);

  const rewardTokenLabel = selectedToken
    ? selectedToken.label
    : form.rewardToken
      ? formatAddress(form.rewardToken)
      : "";

  const rewardTokenDecimals = selectedToken?.decimals ?? 18;
  const rewardTokenIsNative = selectedToken?.isNative ?? form.rewardToken === ZERO_ADDRESS;

  const selectedStrategyOption = useMemo(() => {
    return strategyOptions.find((option) => option.value === form.adoptionStrategyAddress) ?? null;
  }, [strategyOptions, form.adoptionStrategyAddress]);

  const selectedStrategyCopy = useMemo(
    () => (selectedStrategyOption ? resolveStrategyCopy(selectedStrategyOption, t) : null),
    [selectedStrategyOption, t]
  );

  const fallbackStrategyConfig = useMemo(
    () => getStrategyFallback(form.adoptionStrategyAddress),
    [form.adoptionStrategyAddress]
  );

  const displayStrategyConfig = strategyConfigValue ?? fallbackStrategyConfig ?? null;

  const displayStrategyIssues = useMemo(
    () => evaluateStrategyConfig(displayStrategyConfig),
    [displayStrategyConfig]
  );

  const selectedCategoryOption = useMemo(() => {
    return CATEGORY_OPTIONS.find((option) => option.value === form.category) ?? null;
  }, [form.category]);

  const selectedCategoryLabel = selectedCategoryOption
    ? t(`creation.sections.basics.fields.category.options.${selectedCategoryOption.value}`)
    : form.category;

  const deadlineDate = useMemo(() => {
    return form.deadline ? new Date(form.deadline) : null;
  }, [form.deadline]);

  const renderStepContent = () => {
    let body: ReactNode = null;

    switch (activeStep) {
      case "basics":
        body = (
          <>
            <Field
              label={t("creation.sections.basics.fields.title.label")}
              error={errors["basics.title"]}
            >
              <input
                value={form.title}
                onChange={handleBasicChange("title")}
                placeholder={t("creation.sections.basics.fields.title.placeholder")}
                className={inputClass}
              />
            </Field>
            <Field
              label={t("creation.sections.basics.fields.category.label")}
              error={errors["basics.category"]}
            >
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className={inputClass}>
                  <SelectValue
                    placeholder={t("creation.sections.basics.fields.category.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`creation.sections.basics.fields.category.options.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={t("creation.sections.basics.fields.description.label")}
              error={errors["basics.description"]}
            >
              <textarea
                value={form.description}
                onChange={handleBasicChange("description")}
                placeholder={t("creation.sections.basics.fields.description.placeholder")}
                className={`${inputClass} min-h-28 resize-y`}
              />
            </Field>
            <Field
              label={t("creation.sections.basics.fields.requirements.label")}
              error={errors["basics.requirements"]}
            >
              <textarea
                value={form.requirements}
                onChange={handleBasicChange("requirements")}
                placeholder={t("creation.sections.basics.fields.requirements.placeholder")}
                className={`${inputClass} min-h-32 resize-y`}
              />
            </Field>
            <Field label={t("creation.sections.basics.fields.cover.label")}>
              <input
                value={form.coverImage}
                onChange={handleBasicChange("coverImage")}
                placeholder={t("creation.sections.basics.fields.cover.placeholder")}
                className={inputClass}
              />
            </Field>
          </>
        );
        break;
      case "timeline":
        body = (
          <>
            <Field
              label={t("creation.sections.timeline.fields.deadline.label")}
              description={t("creation.sections.timeline.fields.deadline.hint")}
              error={errors["timeline.deadline"]}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border/40 bg-background/40 text-foreground hover:border-primary/50 hover:text-primary flex w-full items-center justify-between rounded-3xl px-4 py-3 text-sm sm:w-60"
                  >
                    {deadlineDate
                      ? format(deadlineDate, "PPP")
                      : t("creation.preview.deadlineFallback")}
                    <svg className="size-4" aria-hidden>
                      <use href="#icon-calendar" />
                    </svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="border-border/40 bg-background/95 w-auto rounded-2xl border p-2 shadow-lg backdrop-blur"
                >
                  <Calendar
                    mode="single"
                    selected={deadlineDate ?? undefined}
                    onSelect={handleDeadlineDateChange}
                    disabled={(date) => date < startOfToday()}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("creation.sections.timeline.fields.rewardAmount.label")}
                error={errors["timeline.rewardAmount"]}
              >
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.rewardAmount}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, rewardAmount: event.target.value }));
                    clearError("timeline.rewardAmount");
                  }}
                  className={inputClass}
                />
              </Field>
              <Field
                label={t("creation.sections.timeline.fields.rewardToken.label")}
                error={errors["timeline.rewardToken"]}
              >
                <Select value={form.rewardToken} onValueChange={handleRewardTokenChange}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue
                      placeholder={t("creation.sections.timeline.fields.rewardToken.placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </>
        );
        break;
      case "guards":
        body = (
          <>
            <GuardSelection
              title={t("creation.sections.guards.submission.title")}
              description={t("creation.sections.guards.submission.description")}
              type="submission"
              options={submissionGuardOptions}
              selectedAddress={form.submissionGuardAddress}
              onSelect={(value) => {
                setForm((prev) => ({ ...prev, submissionGuardAddress: value }));
                clearError("guards.submission.address");
              }}
              isLoading={allowlistQuery.isLoading}
              error={errors["guards.submission.address"]}
            />
            <GuardSelection
              title={t("creation.sections.guards.review.title")}
              description={t("creation.sections.guards.review.description")}
              type="review"
              options={reviewGuardOptions}
              selectedAddress={form.reviewGuardAddress}
              onSelect={(value) => {
                setForm((prev) => ({ ...prev, reviewGuardAddress: value }));
                clearError("guards.review.address");
              }}
              isLoading={allowlistQuery.isLoading}
              error={errors["guards.review.address"]}
            />
          </>
        );
        break;
      case "strategy":
        body = (
          <>
            <StrategySelection
              title={t("creation.sections.strategy.title")}
              description={t("creation.sections.strategy.selectorLabel")}
              options={strategyOptions}
              selectedAddress={form.adoptionStrategyAddress}
              onSelect={(value) => {
                setForm((prev) => ({ ...prev, adoptionStrategyAddress: value }));
                clearError("strategy.address");
                clearError("strategy.config");
              }}
              isLoading={allowlistQuery.isLoading}
              error={errors["strategy.address"] ?? errors["strategy.config"]}
            />
            <StrategyPreview
              config={strategyConfigQuery.data ?? null}
              fallbackConfig={fallbackStrategyConfig}
              isLoading={strategyConfigQuery.isLoading}
              error={
                strategyConfigQuery.error ? extractErrorMessage(strategyConfigQuery.error) : null
              }
              issues={displayStrategyIssues}
            />
          </>
        );
        break;
      case "summary": {
        const submissionSummary = getGuardSummaryItems(
          "submission",
          form.submissionGuardAddress,
          t
        );
        const reviewSummary = getGuardSummaryItems("review", form.reviewGuardAddress, t);
        const strategySummary = buildStrategySummary(
          t,
          displayStrategyConfig,
          displayStrategyIssues
        );
        const strategyConfig = displayStrategyConfig;
        const minReviewsValue = strategyConfig?.minReviews
          ? strategyConfig.minReviews.toString()
          : t("creation.sections.strategy.preview.metrics.none");
        const adoptRatioValue = strategyConfig?.approvalThreshold
          ? `${strategyConfig.approvalThreshold}%`
          : t("creation.sections.strategy.preview.metrics.none");
        const rejectionValue = strategyConfig?.rejectionThreshold
          ? `${strategyConfig.rejectionThreshold}%`
          : t("creation.sections.strategy.preview.metrics.none");
        const expirationValue = strategyConfig?.expirationHours
          ? `${formatHours(strategyConfig.expirationHours)}h`
          : t("creation.sections.strategy.preview.metrics.none");
        const autoAdoptValue = strategyConfig?.allowTimeBasedAdoption
          ? strategyConfig.autoAdoptionHours
            ? `${formatHours(strategyConfig.autoAdoptionHours)}h`
            : t("creation.sections.strategy.preview.metrics.autoDisabled")
          : t("creation.sections.strategy.preview.metrics.autoDisabled");
        const isSuccess = txState.phase === "success";
        body = (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryPill
                label={t("creation.sections.basics.fields.title.label")}
                value={form.title || "-"}
              />
              <SummaryPill
                label={t("creation.sections.basics.fields.category.label")}
                value={selectedCategoryLabel || "-"}
              />
              <SummaryPill
                label={t("creation.sections.timeline.fields.rewardAmount.label")}
                value={form.rewardAmount ? `${form.rewardAmount} ${rewardTokenLabel}` : "-"}
              />
              <SummaryPill
                label={t("creation.sections.timeline.fields.deadline.label")}
                value={form.deadline ? new Date(form.deadline).toLocaleString() : "-"}
              />
              <SummaryPill
                label={t("creation.sections.strategy.preview.metrics.minReviews")}
                value={minReviewsValue}
              />
              <SummaryPill
                label={t("creation.sections.strategy.preview.metrics.approval")}
                value={adoptRatioValue}
              />
              <SummaryPill
                label={t("creation.sections.strategy.preview.metrics.rejection")}
                value={rejectionValue}
              />
              <SummaryPill
                label={t("creation.sections.strategy.preview.metrics.expiration")}
                value={expirationValue}
              />
              <SummaryPill
                label={t("creation.sections.strategy.preview.metrics.auto")}
                value={autoAdoptValue}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard
                title={t("creation.sections.guards.submission.title")}
                items={submissionSummary}
                emptyLabel={t("creation.preview.guardEmpty")}
              />
              <SummaryCard
                title={t("creation.sections.guards.review.title")}
                items={reviewSummary}
                emptyLabel={t("creation.preview.guardEmpty")}
              />
            </div>

            <SummaryCard
              title={t("creation.sections.strategy.title")}
              items={[
                (selectedStrategyCopy?.name ?? selectedStrategyOption?.label)
                  ? t("creation.preview.strategySelected", {
                      label: selectedStrategyCopy?.name ?? selectedStrategyOption?.label ?? "",
                    })
                  : null,
                ...strategySummary,
              ]}
              emptyLabel={t("creation.preview.strategyEmpty")}
            />

            {isSuccess ? (
              <TaskCreationSuccess
                taskId={txState.taskId ?? "0"}
                hashes={txHashes}
                onCreateAnother={handleReset}
              />
            ) : (
              <>
                <label className="border-border/40 bg-background/40 text-muted-foreground flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.agreeToTerms}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, agreeToTerms: event.target.checked }));
                      if (event.target.checked) {
                        clearError("summary.agree");
                      }
                    }}
                    className="border-border/60 bg-background/60 accent-primary mt-1 size-4 rounded"
                  />
                  <span>{t("creation.sections.summary.agree")}</span>
                </label>
              </>
            )}
          </>
        );
        break;
      }
      default:
        body = null;
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <div className="space-y-5">{body}</div>
        <TaskCreationSummaryPanel
          form={form}
          rewardTokenLabel={rewardTokenLabel}
          submissionGuardAddress={form.submissionGuardAddress}
          reviewGuardAddress={form.reviewGuardAddress}
          strategyLabel={selectedStrategyCopy?.name ?? selectedStrategyOption?.label ?? null}
          strategyConfig={displayStrategyConfig}
          strategyIssues={displayStrategyIssues}
          categoryLabel={selectedCategoryLabel}
        />
      </div>
    );
  };

  const primaryActionLabel =
    activeStep === "summary"
      ? isPublishing
        ? t("common.loading")
        : t("creation.actions.publish")
      : t("creation.actions.next");

  return (
    <div className="space-y-8">
      <section className="border-border/40 bg-card/85 rounded-[32px] border p-6 shadow-lg">
        <h1 className="text-foreground text-2xl font-semibold">{t("creation.title")}</h1>
        <p className="text-muted-foreground/80 mt-2 text-sm">{t("creation.subtitle")}</p>
      </section>

      <section className="border-border/30 bg-card/85 rounded-[28px] border p-6 shadow-inner lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          {steps.map((step, index) => (
            <div key={step} className="flex min-w-[96px] flex-1 flex-col items-center gap-2">
              <div
                className={`flex size-10 items-center justify-center rounded-full border ${
                  index <= stepIndex
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase">
                {t(`creation.steps.${step}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Card className="border-border/40 bg-card/85 border">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-foreground text-base">
                {t(`creation.sections.${activeStep}.title`)}
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {t(`creation.sections.${activeStep}.description`)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-2xl"
                onClick={goToPrevious}
                disabled={stepIndex === 0}
              >
                {t("creation.actions.prev")}
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground rounded-2xl"
                onClick={handleNextAction}
                disabled={publishDisabled}
              >
                {primaryActionLabel}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-6 text-sm">
            {renderStepContent()}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-3xl border border-border/40 bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

type FieldProps = {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, description, error, children }: FieldProps) {
  return (
    <div>
      <p className="text-muted-foreground/80 text-xs tracking-[0.18em] uppercase">{label}</p>
      <div className="mt-2">{children}</div>
      {description && <p className="text-muted-foreground/70 mt-1 text-xs">{description}</p>}
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}
type GuardKind = "submission" | "review";

const GUARD_COPY_MAP: Record<GuardKind, Record<string, { nameKey: string; summaryKey: string }>> = {
  submission: {
    [ZERO_ADDRESS]: {
      nameKey: "creation.sections.guards.submission.options.none.name",
      summaryKey: "creation.sections.guards.submission.options.none.summary",
    },
    [CONTRACT_ADDRESSES.SUBMISSION_GUARD]: {
      nameKey: "creation.sections.guards.submission.options.atlas.name",
      summaryKey: "creation.sections.guards.submission.options.atlas.summary",
    },
  },
  review: {
    [ZERO_ADDRESS]: {
      nameKey: "creation.sections.guards.review.options.none.name",
      summaryKey: "creation.sections.guards.review.options.none.summary",
    },
    [CONTRACT_ADDRESSES.REVIEW_GUARD]: {
      nameKey: "creation.sections.guards.review.options.atlas.name",
      summaryKey: "creation.sections.guards.review.options.atlas.summary",
    },
  },
};

const STRATEGY_COPY_MAP: Record<string, { nameKey: string; summaryKey: string }> = {
  [CONTRACT_ADDRESSES.SIMPLE_ADOPTION_STRATEGY]: {
    nameKey: "creation.sections.strategy.options.atlas.name",
    summaryKey: "creation.sections.strategy.options.atlas.summary",
  },
};

function getStrategyFallback(address?: string | null): StrategyConfig | null {
  return getAdoptionStrategyFallback(address);
}

type GuardSelectionProps = {
  title: string;
  description: string;
  type: GuardKind;
  options: SelectOption[];
  selectedAddress?: string;
  onSelect: (value: string) => void;
  isLoading: boolean;
  error?: string;
};

function GuardSelection({
  title,
  description,
  type,
  options,
  selectedAddress,
  onSelect,
  isLoading,
  error,
}: GuardSelectionProps) {
  const { t } = useTranslation();
  const hasOptions = options.length > 0;

  return (
    <section className="border-border/40 bg-card/80 rounded-[28px] border p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
      {isLoading && !hasOptions ? (
        <p className="text-muted-foreground/80 mt-4 text-xs">{t("common.loading")}</p>
      ) : hasOptions ? (
        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <GuardOptionCard
              key={option.value}
              type={type}
              address={option.value}
              selected={option.value === selectedAddress}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground/70 mt-4 text-xs">
          {t(`creation.sections.guards.${type}.empty`)}
        </p>
      )}
    </section>
  );
}

type StrategySelectionProps = {
  title: string;
  description: string;
  options: SelectOption[];
  selectedAddress?: string;
  onSelect: (value: string) => void;
  isLoading: boolean;
  error?: string;
};

function StrategySelection({
  title,
  description,
  options,
  selectedAddress,
  onSelect,
  isLoading,
  error,
}: StrategySelectionProps) {
  const { t } = useTranslation();
  const hasOptions = options.length > 0;

  return (
    <section className="border-border/40 bg-card/80 rounded-[28px] border p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
      {isLoading && !hasOptions ? (
        <p className="text-muted-foreground/80 mt-4 text-xs">{t("common.loading")}</p>
      ) : hasOptions ? (
        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <StrategyOptionCard
              key={option.value}
              option={option}
              selected={option.value === selectedAddress}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground/70 mt-4 text-xs">
          {t("creation.sections.strategy.empty")}
        </p>
      )}
    </section>
  );
}

type StrategyOptionCardProps = {
  option: SelectOption;
  selected: boolean;
  onSelect: (value: string) => void;
};

function StrategyOptionCard({ option, selected, onSelect }: StrategyOptionCardProps) {
  const { t } = useTranslation();
  const copy = resolveStrategyCopy(option, t);
  const shortAddress = formatAddress(option.value);

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        "border-border/40 bg-background/30 w-full rounded-[24px] border px-4 py-3 text-left transition",
        selected
          ? "border-primary/60 bg-primary/10 shadow-lg"
          : "hover:border-primary/40 hover:bg-primary/5"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-semibold">{copy.name}</p>
          <p className="text-muted-foreground/80 text-xs">{shortAddress}</p>
        </div>
        {selected && (
          <span className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
            {t("creation.sections.strategy.selected")}
          </span>
        )}
      </div>
      <p className="text-muted-foreground/80 mt-2 text-xs">{copy.summary}</p>
    </button>
  );
}

type GuardOptionCardProps = {
  type: GuardKind;
  address: string;
  selected: boolean;
  onSelect: (value: string) => void;
};

function GuardOptionCard({ type, address, selected, onSelect }: GuardOptionCardProps) {
  const { t } = useTranslation();
  const copy = resolveGuardCopy(type, address, t);
  const shortAddress = address === ZERO_ADDRESS ? null : formatAddress(address);

  return (
    <button
      type="button"
      onClick={() => onSelect(address)}
      className={cn(
        "border-border/40 bg-background/30 w-full rounded-[24px] border px-4 py-3 text-left transition",
        selected
          ? "border-primary/60 bg-primary/10 shadow-lg"
          : "hover:border-primary/40 hover:bg-primary/5"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-semibold">{copy.name}</p>
          {shortAddress && <p className="text-muted-foreground/80 text-xs">{shortAddress}</p>}
        </div>
        {selected && (
          <span className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
            {t("creation.sections.guards.selected")}
          </span>
        )}
      </div>
      <p className="text-muted-foreground/80 mt-2 text-xs">{copy.summary}</p>
    </button>
  );
}

function resolveGuardCopy(
  type: GuardKind,
  address: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const normalized = address.toLowerCase();
  const entry = GUARD_COPY_MAP[type][normalized];

  if (entry) {
    return {
      name: t(entry.nameKey),
      summary: t(entry.summaryKey),
    };
  }

  return {
    name: t("creation.sections.guards.generic.name"),
    summary: t("creation.sections.guards.generic.summary"),
  };
}

function resolveStrategyCopy(option: SelectOption, t: Translator) {
  const normalized = option.value.toLowerCase();
  const entry = STRATEGY_COPY_MAP[normalized];

  if (entry) {
    return {
      name: t(entry.nameKey),
      summary: t(entry.summaryKey),
    };
  }

  if (option.label || option.description) {
    return {
      name: option.label || formatAddress(option.value),
      summary: option.description ?? t("creation.sections.strategy.generic.summary"),
    };
  }

  return {
    name: t("creation.sections.strategy.generic.name"),
    summary: t("creation.sections.strategy.generic.summary"),
  };
}

type Translator = ReturnType<typeof useTranslation>["t"];

function getGuardSummaryItems(type: GuardKind, address: string | undefined, t: Translator) {
  if (!address) {
    return [] as string[];
  }

  const copy = resolveGuardCopy(type, address, t);
  if (address === ZERO_ADDRESS) {
    return [copy.name, copy.summary];
  }

  return [`${copy.name} · ${formatAddress(address)}`, copy.summary];
}

type StrategyPreviewProps = {
  config: StrategyConfig | null;
  fallbackConfig?: StrategyConfig | null;
  isLoading: boolean;
  error: string | null;
  issues: StrategyConfigIssue[];
};

function StrategyPreview({
  config,
  fallbackConfig,
  isLoading,
  error,
  issues,
}: StrategyPreviewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="border-border/40 bg-background/30 text-muted-foreground rounded-[28px] border px-5 py-6 text-xs">
        {t("creation.sections.strategy.preview.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-[28px] border px-5 py-6 text-xs">
        {t("creation.sections.strategy.preview.error", { message: error })}
      </div>
    );
  }

  const displayConfig = config ?? fallbackConfig ?? null;
  const usingFallback = !config && Boolean(fallbackConfig);

  if (!displayConfig) {
    return (
      <div className="border-border/40 bg-background/30 text-muted-foreground rounded-[28px] border px-5 py-6 text-xs">
        {t("creation.sections.strategy.preview.empty")}
      </div>
    );
  }

  const approvalCount = computeThresholdCount(
    displayConfig.minReviews,
    displayConfig.approvalThreshold
  );
  const rejectionCount = computeThresholdCount(
    displayConfig.minReviews,
    displayConfig.rejectionThreshold
  );
  const expirationDisplay =
    displayConfig.expirationHours > 0 ? `${formatHours(displayConfig.expirationHours)}h` : "-";
  const approvalDisplay = t("creation.sections.strategy.preview.metrics.approvalDetail", {
    percentage: displayConfig.approvalThreshold,
    count: approvalCount,
  });
  const rejectionDisplay =
    displayConfig.rejectionThreshold > 0
      ? t("creation.sections.strategy.preview.metrics.rejectionDetail", {
          percentage: displayConfig.rejectionThreshold,
          count: rejectionCount,
        })
      : t("creation.sections.strategy.preview.metrics.none");
  const autoSummary = displayConfig.allowTimeBasedAdoption
    ? displayConfig.autoAdoptionHours
      ? t("creation.sections.strategy.preview.summary.auto", {
          autoHours: formatHours(displayConfig.autoAdoptionHours),
        })
      : t("creation.sections.strategy.preview.summary.autoMissing")
    : t("creation.sections.strategy.preview.summary.autoDisabled");

  const issueMessages: Record<StrategyConfigIssue, string> = {
    minReviews: t("creation.sections.strategy.preview.issues.minReviews"),
    approvalOutOfRange: t("creation.sections.strategy.preview.issues.approvalOutOfRange"),
    rejectionOutOfRange: t("creation.sections.strategy.preview.issues.rejectionOutOfRange"),
    thresholdOverlap: t("creation.sections.strategy.preview.issues.thresholdOverlap"),
    expirationMissing: t("creation.sections.strategy.preview.issues.expirationMissing"),
    autoAdoptionMissing: t("creation.sections.strategy.preview.issues.autoAdoptionMissing"),
    autoAdoptionOrder: t("creation.sections.strategy.preview.issues.autoAdoptionOrder"),
  };

  return (
    <div className="border-border/40 bg-background/30 rounded-[28px] border px-5 py-6">
      <p className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">
        {t("creation.sections.strategy.preview.title")}
      </p>
      {usingFallback && (
        <p className="text-muted-foreground/70 mt-2 text-[11px]">
          {t("creation.sections.strategy.preview.fallback")}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StrategyPreviewMetric
          label={t("creation.sections.strategy.preview.metrics.minReviews")}
          value={displayConfig.minReviews > 0 ? displayConfig.minReviews.toString() : "-"}
        />
        <StrategyPreviewMetric
          label={t("creation.sections.strategy.preview.metrics.approval")}
          value={approvalDisplay}
        />
        <StrategyPreviewMetric
          label={t("creation.sections.strategy.preview.metrics.rejection")}
          value={rejectionDisplay}
        />
        <StrategyPreviewMetric
          label={t("creation.sections.strategy.preview.metrics.expiration")}
          value={expirationDisplay}
        />
      </div>
      <div className="text-muted-foreground/80 mt-4 space-y-2 text-xs">
        <p>
          {t("creation.sections.strategy.preview.summary.approval", {
            minReviews: displayConfig.minReviews,
            approvalThreshold: displayConfig.approvalThreshold,
            approvalsRequired: approvalCount,
          })}
        </p>
        {displayConfig.rejectionThreshold > 0 && (
          <p>
            {t("creation.sections.strategy.preview.summary.rejection", {
              rejectionThreshold: displayConfig.rejectionThreshold,
              rejectionsRequired: rejectionCount,
            })}
          </p>
        )}
        {displayConfig.expirationHours > 0 && (
          <p>
            {t("creation.sections.strategy.preview.summary.expiration", {
              expirationHours: formatHours(displayConfig.expirationHours),
            })}
          </p>
        )}
        <p>{autoSummary}</p>
      </div>
      {issues.length > 0 && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mt-5 rounded-[24px] border px-4 py-3 text-xs">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase">
            {t("creation.sections.strategy.preview.issues.title")}
          </p>
          <ul className="text-destructive/90 mt-2 list-disc space-y-1 pl-4 normal-case">
            {issues.map((issue) => (
              <li key={issue}>{issueMessages[issue]}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type StrategyPreviewMetricProps = {
  label: string;
  value: string;
};

function StrategyPreviewMetric({ label, value }: StrategyPreviewMetricProps) {
  const isPlaceholder = value === "-";
  return (
    <div className="border-border/40 bg-background/25 rounded-3xl border px-4 py-3">
      <p className="text-muted-foreground/70 text-[11px] tracking-[0.2em] uppercase">{label}</p>
      <p
        className={`mt-2 text-base font-semibold ${
          isPlaceholder ? "text-muted-foreground/60" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type SummaryPillProps = {
  label: string;
  value: string;
};

function SummaryPill({ label, value }: SummaryPillProps) {
  return (
    <div className="border-border/40 bg-background/30 rounded-3xl border px-5 py-4">
      <p className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-foreground mt-2 text-sm">{value}</p>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  items: Array<string | null> | string[];
  emptyLabel?: string;
};

function SummaryCard({ title, items, emptyLabel }: SummaryCardProps) {
  const filtered = (items ?? []).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return (
    <div className="border-border/40 bg-background/30 rounded-[28px] border p-5">
      <h4 className="text-foreground text-sm font-semibold">{title}</h4>
      <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
        {filtered.length ? (
          filtered.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)
        ) : (
          <li className="text-muted-foreground/70">{emptyLabel ?? "-"}</li>
        )}
      </ul>
    </div>
  );
}

type TaskCreationSummaryPanelProps = {
  form: TaskCreationDraft;
  rewardTokenLabel: string;
  submissionGuardAddress?: string | null;
  reviewGuardAddress?: string | null;
  strategyLabel?: string | null;
  strategyConfig?: StrategyConfig | null;
  strategyIssues?: StrategyConfigIssue[];
  categoryLabel?: string | null;
};

function TaskCreationSummaryPanel({
  form,
  rewardTokenLabel,
  submissionGuardAddress,
  reviewGuardAddress,
  strategyLabel,
  strategyConfig,
  strategyIssues = [],
  categoryLabel,
}: TaskCreationSummaryPanelProps) {
  const { t } = useTranslation();

  const headline = form.title.trim() || t("creation.preview.untitled");
  const description = form.description.trim() || t("creation.preview.descriptionFallback");
  const categoryText = categoryLabel?.trim() || form.category.trim();
  const categoryValue = categoryText || t("creation.preview.categoryFallback");
  const rewardValue = form.rewardAmount.trim()
    ? `${form.rewardAmount} ${rewardTokenLabel}`.trim()
    : t("creation.preview.rewardFallback");
  const deadlineValue = form.deadline
    ? format(new Date(form.deadline), "PPP")
    : t("creation.preview.deadlineFallback");

  const submissionSummary = getGuardSummaryItems(
    "submission",
    submissionGuardAddress ?? undefined,
    t
  );
  const reviewSummary = getGuardSummaryItems("review", reviewGuardAddress ?? undefined, t);
  const strategySummary = [
    strategyLabel ? t("creation.preview.strategySelected", { label: strategyLabel }) : null,
    ...buildStrategySummary(t, strategyConfig, strategyIssues),
  ];

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="border-border/40 bg-background/30 rounded-[28px] border p-5">
        <p className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">
          {t("creation.preview.title")}
        </p>
        <h4 className="text-foreground mt-3 text-base font-semibold">{headline}</h4>
        <p className="text-muted-foreground/80 mt-2 line-clamp-4 text-xs">{description}</p>
        <div className="mt-4 space-y-3">
          <SummaryPill
            label={t("creation.sections.basics.fields.category.label")}
            value={categoryValue}
          />
          <SummaryPill
            label={t("creation.sections.timeline.fields.rewardAmount.label")}
            value={rewardValue}
          />
          <SummaryPill
            label={t("creation.sections.timeline.fields.deadline.label")}
            value={deadlineValue}
          />
        </div>
        {!form.title.trim() && !form.description.trim() && (
          <p className="text-muted-foreground/70 mt-4 text-xs">{t("creation.preview.missing")}</p>
        )}
      </div>
      <SummaryCard
        title={t("creation.sections.guards.submission.title")}
        items={submissionSummary}
        emptyLabel={t("creation.preview.guardEmpty")}
      />
      <SummaryCard
        title={t("creation.sections.guards.review.title")}
        items={reviewSummary}
        emptyLabel={t("creation.preview.guardEmpty")}
      />
      <SummaryCard
        title={t("creation.sections.strategy.title")}
        items={strategySummary}
        emptyLabel={t("creation.preview.strategyEmpty")}
      />
    </aside>
  );
}

type TaskCreationSuccessProps = {
  taskId: string;
  hashes: string[];
  onCreateAnother: () => void;
};

function TaskCreationSuccess({ taskId, hashes, onCreateAnother }: TaskCreationSuccessProps) {
  const { t } = useTranslation();
  const latestHash = hashes.at(-1);

  return (
    <div className="space-y-4 rounded-[28px] border border-emerald-500/40 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-200">
      <div>
        <p className="text-xs tracking-[0.2em] text-emerald-200/80 uppercase">
          {t("creation.success.title")}
        </p>
        <p className="mt-1 text-xs text-emerald-100/80">
          {t("creation.success.subtitle", { taskId })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/tasks/${taskId}`} className="inline-flex">
          <Button size="sm" className="rounded-2xl bg-emerald-500 text-emerald-950">
            {t("creation.success.view")}
          </Button>
        </Link>
        {latestHash && (
          <a
            href={getExplorerTransactionUrl(latestHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button
              size="sm"
              variant="outline"
              className="rounded-2xl border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/20"
            >
              {t("creation.tx.hashLabel")}
            </Button>
          </a>
        )}
        <Button
          size="sm"
          variant="outline"
          className="rounded-2xl border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/20"
          onClick={onCreateAnother}
        >
          {t("creation.success.createAnother")}
        </Button>
      </div>
      <p className="text-[11px] tracking-[0.2em] text-emerald-200/70 uppercase">
        {t("creation.success.redirect")}
      </p>
    </div>
  );
}

function buildStrategySummary(
  t: Translator,
  config: StrategyConfig | null | undefined,
  issues: StrategyConfigIssue[] = []
): string[] {
  if (!config) {
    return issues.length ? [t("creation.preview.strategyIssuesFlag")] : [];
  }

  const items: string[] = [];
  const approvalCount = computeThresholdCount(config.minReviews, config.approvalThreshold);
  const rejectionCount = computeThresholdCount(config.minReviews, config.rejectionThreshold);

  if (config.minReviews > 0) {
    items.push(
      `${t("creation.sections.strategy.preview.metrics.minReviews")}: ${config.minReviews}`
    );
  }

  if (config.approvalThreshold > 0) {
    items.push(
      `${t("creation.sections.strategy.preview.metrics.approval")}: ${t(
        "creation.sections.strategy.preview.metrics.approvalDetail",
        {
          percentage: config.approvalThreshold,
          count: approvalCount,
        }
      )}`
    );
  }

  if (config.rejectionThreshold > 0) {
    items.push(
      `${t("creation.sections.strategy.preview.metrics.rejection")}: ${t(
        "creation.sections.strategy.preview.metrics.rejectionDetail",
        {
          percentage: config.rejectionThreshold,
          count: rejectionCount,
        }
      )}`
    );
  }

  if (config.expirationHours > 0) {
    items.push(
      `${t("creation.sections.strategy.preview.metrics.expiration")}: ${formatHours(config.expirationHours)}h`
    );
  }

  items.push(
    `${t("creation.sections.strategy.preview.metrics.auto")}: ${
      config.allowTimeBasedAdoption && config.autoAdoptionHours
        ? `${formatHours(config.autoAdoptionHours)}h`
        : t("creation.sections.strategy.preview.metrics.autoDisabled")
    }`
  );

  if (issues.length) {
    items.push(t("creation.preview.strategyIssuesFlag"));
  }

  return items;
}

function formatHours(value: number | null): string {
  if (!value || !Number.isFinite(value)) {
    return "";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? Math.trunc(rounded).toString() : rounded.toFixed(1);
}

function computeThresholdCount(minReviews: number, threshold: number): number {
  if (minReviews <= 0 || threshold <= 0) {
    return 0;
  }
  return Math.min(minReviews, Math.max(1, Math.ceil((threshold / 100) * minReviews)));
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const maybeError = error as { shortMessage?: string; message?: string };
    if (maybeError.shortMessage) {
      return maybeError.shortMessage;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
