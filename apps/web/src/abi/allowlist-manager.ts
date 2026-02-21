export const allowlistManagerAbi = [
  {
    type: "function",
    name: "allowGuard",
    stateMutability: "nonpayable",
    inputs: [{ name: "guard", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "disallowGuard",
    stateMutability: "nonpayable",
    inputs: [{ name: "guard", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "allowStrategy",
    stateMutability: "nonpayable",
    inputs: [{ name: "strategy", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "disallowStrategy",
    stateMutability: "nonpayable",
    inputs: [{ name: "strategy", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "allowToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "disallowToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
] as const;

export type AllowlistManagerAbi = typeof allowlistManagerAbi;
