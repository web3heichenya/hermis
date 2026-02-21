export type TaskStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";

export type SubmissionStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NORMAL"
  | "ADOPTED"
  | "REMOVED"
  | "REJECTED"
  | "PENDING"
  | "APPROVED"
  | "DISMISSED";

export type ArbitrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISMISSED";

export interface GuardRequirement {
  address?: string;
  minReputation?: number;
  minCategoryScore?: number;
  requiredCategory?: string;
  maxFailedSubmissions?: number;
  minSuccessRate?: number;
  minReviewCount?: number;
  minAccuracyRate?: number;
  stakeRequired?: number;
  categories?: string[];
  allowlist?: string[];
  allowList?: string[];
  requireStake?: boolean;
  enforceCategory?: boolean;
}

export interface TaskCreationDraft {
  title: string;
  category: string;
  description: string;
  requirements: string;
  coverImage: string;
  deadline: string;
  rewardAmount: string;
  rewardToken: string;
  submissionGuardAddress: string;
  reviewGuardAddress: string;
  adoptionStrategyAddress: string;
  agreeToTerms: boolean;
}

export interface Submission {
  id: string;
  contractId?: string | null;
  version?: number;
  author: string;
  avatarSeed?: string;
  submittedAt: string;
  status: SubmissionStatus;
  approveCount: number;
  rejectCount: number;
  summary?: string;
  attachments: number;
  contentHash?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  category?: string;
  status: TaskStatus;
  reward: number;
  token: string;
  rewardTokenAddress?: string;
  deadline: string;
  release?: string;
  guardTags: string[];
  publisher?: { address: string } | null;
  submissions: Submission[];
  submissionCount?: number;
  activeSubmissionCount?: number;
  guards: {
    submission: GuardRequirement & { address?: string };
    review: GuardRequirement & { address?: string };
  };
  adoptionStrategy: {
    minReviews: number;
    approvalThreshold: number;
    rejectionThreshold?: number;
    allowTimeBasedAdoption?: boolean;
    autoAdoptAfterHours?: number;
  };
  adoptionStrategyAddress?: string | null;
}

export interface ReviewQueueItem {
  id: string;
  taskId: string;
  submissionId: string;
  title: string;
  author: string;
  status: SubmissionStatus;
  deadline: string;
  guard: string;
}

export interface HermisUser {
  address: string;
  username: string;
  reputation: number;
  stake: number;
  state: "NORMAL" | "UNINITIALIZED" | string;
  sbtLevel: string;
  pendingRewards: number;
  categoryScores: Array<{ label: string; value: number }>;
  reputationHistory: Array<{ timestamp: string; value: number }>;
}

export interface ReviewerMetrics {
  totalReviews: number;
  concludedReviews: number;
  accurateReviews: number;
  accuracyRate: number;
  disputesDefended: number;
  queuedRewards: Array<{ symbol: string; amount: number }>;
}

export interface ArbitrationCase {
  id: string;
  arbitrationId?: string;
  type: string;
  typeKey?: string;
  status: ArbitrationStatus;
  filedAt: string;
  resolvedAt?: string | null;
  requester: string;
  targetId: string;
  fee: number;
  feeTokenSymbol?: string;
  summary?: string;
  evidence?: string | null;
}
