export const submissionManagerAbi = [
  {
    type: "function",
    name: "submitWork",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "contentHash", type: "string" },
    ],
    outputs: [{ name: "submissionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "updateSubmission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "submissionId", type: "uint256" },
      { name: "newContentHash", type: "string" },
    ],
    outputs: [{ name: "newVersion", type: "uint256" }],
  },
  {
    type: "function",
    name: "submitReview",
    stateMutability: "nonpayable",
    inputs: [
      { name: "submissionId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "reviewId", type: "uint256" }],
  },
  {
    type: "function",
    name: "evaluateSubmissionStatus",
    stateMutability: "nonpayable",
    inputs: [{ name: "submissionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "SubmissionCreated",
    inputs: [
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "taskId", type: "uint256", indexed: true },
      { name: "submitter", type: "address", indexed: true },
      { name: "contentHash", type: "string", indexed: false },
      { name: "version", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SubmissionUpdated",
    inputs: [
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "newContentHash", type: "string", indexed: false },
      { name: "newVersion", type: "uint256", indexed: false },
      { name: "updatedAt", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReviewSubmitted",
    inputs: [
      { name: "reviewId", type: "uint256", indexed: true },
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "reviewer", type: "address", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SubmissionStatusChanged",
    inputs: [
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "oldStatus", type: "uint8", indexed: false },
      { name: "newStatus", type: "uint8", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type SubmissionManagerAbi = typeof submissionManagerAbi;
