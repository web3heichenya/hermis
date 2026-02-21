export const adoptionStrategyMetadataAbi = [
  {
    type: "function",
    name: "getStrategyMetadata",
    stateMutability: "pure",
    inputs: [],
    outputs: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "description", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getStrategyConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "config", type: "bytes" }],
  },
  {
    type: "function",
    name: "getSimpleAdoptionConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "minReviewsRequired", type: "uint256" },
          { name: "approvalThreshold", type: "uint256" },
          { name: "rejectionThreshold", type: "uint256" },
          { name: "expirationTime", type: "uint256" },
          { name: "allowTimeBasedAdoption", type: "bool" },
          { name: "autoAdoptionTime", type: "uint256" },
        ],
      },
    ],
  },
] as const;

export type AdoptionStrategyMetadataAbi = typeof adoptionStrategyMetadataAbi;
