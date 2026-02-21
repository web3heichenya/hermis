export const reputationManagerAbi = [
  {
    type: "function",
    name: "stake",
    stateMutability: "payable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "token", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "requestUnstake",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "initializeUser",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
] as const;

export type ReputationManagerAbi = typeof reputationManagerAbi;
