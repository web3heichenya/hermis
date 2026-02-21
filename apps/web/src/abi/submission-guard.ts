export const submissionGuardAbi = [
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
    name: "getSubmissionConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        components: [
          { name: "minReputationScore", type: "uint256" },
          { name: "minCategoryScore", type: "uint256" },
          { name: "maxFailedSubmissions", type: "uint256" },
          { name: "minSuccessRate", type: "uint256" },
          { name: "requireCategoryExpertise", type: "bool" },
          { name: "enforceSuccessRate", type: "bool" },
          { name: "requiredCategory", type: "string" },
        ],
        name: "config",
        type: "tuple",
      },
    ],
  },
] as const;

export type SubmissionGuardAbi = typeof submissionGuardAbi;
