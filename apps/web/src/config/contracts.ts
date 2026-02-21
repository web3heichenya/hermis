export const CONTRACT_ADDRESSES = {
  ALLOWLIST_MANAGER: (
    process.env.NEXT_PUBLIC_ALLOWLIST_MANAGER_ADDRESS ??
    "0x3b3e3ee79bf8ce7fdd144d93f275e765aeb1be48"
  ).toLowerCase(),
  ARBITRATION_MANAGER: (
    process.env.NEXT_PUBLIC_ARBITRATION_MANAGER_ADDRESS ??
    "0xdf2e26ee889eb3b63be42b36dd619fe306f70cb9"
  ).toLowerCase(),
  BASIC_REWARD_STRATEGY: (
    process.env.NEXT_PUBLIC_BASIC_REWARD_STRATEGY_ADDRESS ??
    "0x52c96cad4722ef8216a3699e3cb3bd6c06844b09"
  ).toLowerCase(),
  GLOBAL_GUARD: (
    process.env.NEXT_PUBLIC_GLOBAL_GUARD_ADDRESS ?? "0x0150192a139d592cc50179291a6a40fd228eb4a5"
  ).toLowerCase(),
  HERMIS_SBT: (
    process.env.NEXT_PUBLIC_HERMIS_SBT_ADDRESS ?? "0xd44d9d61c36f2fb0b0095da91b9541bfefd94749"
  ).toLowerCase(),
  REPUTATION_MANAGER: (
    process.env.NEXT_PUBLIC_REPUTATION_MANAGER_ADDRESS ??
    "0x993966471695dfe32fd263d0c255d921fb9d02a6"
  ).toLowerCase(),
  REVIEW_GUARD: (
    process.env.NEXT_PUBLIC_REVIEW_GUARD_ADDRESS ?? "0x3a0508bbf4acd261fe3fecb1267be0fbccca6dba"
  ).toLowerCase(),
  SIMPLE_ADOPTION_STRATEGY: (
    process.env.NEXT_PUBLIC_SIMPLE_ADOPTION_STRATEGY_ADDRESS ??
    "0xbbcb88b4d6ea2f860ab8ae8db035b11f3c052e01"
  ).toLowerCase(),
  SUBMISSION_GUARD: (
    process.env.NEXT_PUBLIC_SUBMISSION_GUARD_ADDRESS ?? "0x65da79467f60cb4829183d50bb4fa9a836dfcb07"
  ).toLowerCase(),
  SUBMISSION_MANAGER: (
    process.env.NEXT_PUBLIC_SUBMISSION_MANAGER_ADDRESS ??
    "0xa770ffd8ce8f23d47b6e65e63280953fd37da3c2"
  ).toLowerCase(),
  TASK_MANAGER: (
    process.env.NEXT_PUBLIC_TASK_MANAGER_ADDRESS ?? "0x5fc6133a49be7b8395e2a0978b6b06b1ed72f424"
  ).toLowerCase(),
  TREASURY: (
    process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "0x1cc16662dae018d4799689abf15a974106eee09b"
  ).toLowerCase(),
} as const;

export type ContractKey = keyof typeof CONTRACT_ADDRESSES;

export function getContractAddress(key: ContractKey) {
  return CONTRACT_ADDRESSES[key];
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const TOKEN_METADATA: Record<string, { symbol: string; decimals: number }> = {
  "0x833589fcd6edb6e08f4c7c23142546c457aeeb86": { symbol: "USDC", decimals: 6 },
  "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
};

export function getTokenMetadata(address?: string | null) {
  if (!address || address.toLowerCase() === ZERO_ADDRESS) {
    return { symbol: "ETH", decimals: 18 };
  }

  return (
    TOKEN_METADATA[address.toLowerCase()] ?? {
      symbol: "TOKEN",
      decimals: 18,
    }
  );
}
