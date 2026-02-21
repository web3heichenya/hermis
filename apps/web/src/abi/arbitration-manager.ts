export const arbitrationManagerAbi = [
  {
    type: "function",
    name: "feeToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getArbitrationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "fee", type: "uint256" }],
  },
  {
    type: "function",
    name: "canRequestArbitration",
    stateMutability: "view",
    inputs: [
      { name: "arbitrationType", type: "uint8" },
      { name: "targetId", type: "uint256" },
    ],
    outputs: [
      { name: "canRequest", type: "bool" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "function",
    name: "requestSubmissionArbitration",
    stateMutability: "payable",
    inputs: [
      { name: "submissionId", type: "uint256" },
      { name: "evidence", type: "string" },
      { name: "depositAmount", type: "uint256" },
    ],
    outputs: [{ name: "arbitrationId", type: "uint256" }],
  },
  {
    type: "function",
    name: "requestUserArbitration",
    stateMutability: "payable",
    inputs: [
      { name: "user", type: "address" },
      { name: "evidence", type: "string" },
      { name: "depositAmount", type: "uint256" },
    ],
    outputs: [{ name: "arbitrationId", type: "uint256" }],
  },
  {
    type: "event",
    name: "ArbitrationRequested",
    inputs: [
      { name: "arbitrationId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "arbitrationType", type: "uint8", indexed: false },
      { name: "targetId", type: "uint256", indexed: false },
      { name: "depositAmount", type: "uint256", indexed: false },
      { name: "evidence", type: "string", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type ArbitrationManagerAbi = typeof arbitrationManagerAbi;
