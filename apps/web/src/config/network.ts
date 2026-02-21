export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const BASE_SEPOLIA = {
  id: BASE_SEPOLIA_CHAIN_ID,
  name: "Base Sepolia",
  explorerUrl: "https://sepolia.basescan.org",
};

const SUPPORTED_CHAINS = [BASE_SEPOLIA];

const envChainId = process.env.NEXT_PUBLIC_REQUIRED_CHAIN_ID;

export function getRequiredChain() {
  const parsed = envChainId ? Number(envChainId) : BASE_SEPOLIA.id;
  const chain = SUPPORTED_CHAINS.find((item) => item.id === parsed);
  return chain ?? BASE_SEPOLIA;
}

export function getExplorerUrl(address?: string | null) {
  const base = getRequiredChain().explorerUrl ?? BASE_SEPOLIA.explorerUrl;
  if (!address) return base;
  return `${base}/address/${address}`;
}

export function getExplorerTransactionUrl(hash?: string | null) {
  const base = getRequiredChain().explorerUrl ?? BASE_SEPOLIA.explorerUrl;
  if (!hash) return base;
  return `${base}/tx/${hash}`;
}
