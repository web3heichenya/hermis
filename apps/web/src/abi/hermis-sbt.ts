export const hermisSbtAbi = [
  {
    type: "function",
    name: "getUserData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "reputation", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "stakeAmount", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "hasSBT",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "exists", type: "bool" }],
  },
] as const;

export type HermisSbtAbi = typeof hermisSbtAbi;
