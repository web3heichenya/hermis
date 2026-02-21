export const reviewGuardAbi = [
  {
    type: "function",
    name: "validateUser",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "success", type: "bool" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getReviewConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        components: [
          { name: "minReputationScore", type: "uint256" },
          { name: "minCategoryScore", type: "uint256" },
          { name: "minReviewCount", type: "uint256" },
          { name: "minAccuracyRate", type: "uint256" },
          { name: "requireCategoryExpertise", type: "bool" },
          { name: "enforceAccuracyRate", type: "bool" },
          { name: "requiredCategory", type: "string" },
        ],
        name: "config",
        type: "tuple",
      },
    ],
  },
] as const;

export type ReviewGuardAbi = typeof reviewGuardAbi;
