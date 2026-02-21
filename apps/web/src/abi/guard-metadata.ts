export const guardMetadataAbi = [
  {
    type: "function",
    name: "getGuardMetadata",
    stateMutability: "pure",
    inputs: [],
    outputs: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "description", type: "string" },
    ],
  },
] as const;

export type GuardMetadataAbi = typeof guardMetadataAbi;
