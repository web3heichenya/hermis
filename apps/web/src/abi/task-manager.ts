export const taskManagerAbi = [
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "requirements", type: "string" },
      { name: "category", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "reward", type: "uint256" },
      { name: "rewardToken", type: "address" },
      { name: "submissionGuard", type: "address" },
      { name: "reviewGuard", type: "address" },
      { name: "adoptionStrategy", type: "address" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    type: "function",
    name: "publishTask",
    stateMutability: "payable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "publisher", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "category", type: "string", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "reward", type: "uint256", indexed: false },
      { name: "rewardToken", type: "address", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TaskPublished",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "publishedAt", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type TaskManagerAbi = typeof taskManagerAbi;
