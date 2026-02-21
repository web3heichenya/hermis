import { formatAddress } from "@/lib/wallet";
import {
  CONTRACT_ADDRESSES,
  TOKEN_METADATA,
  ZERO_ADDRESS,
  getTokenMetadata,
} from "@/config/contracts";
import { getAdoptionStrategyFallback } from "@/config/strategy-defaults";
import type {
  ArbitrationCase,
  ArbitrationStatus,
  HermisUser,
  ReviewerMetrics,
  ReviewQueueItem,
  SubmissionStatus,
  Task,
} from "@/types/hermis";

const DEFAULT_SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/122371/hermis-base-sepolia/v0.0.1";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? DEFAULT_SUBGRAPH_URL;

interface GraphResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Subgraph request failed with status ${res.status}`);
  }

  const json = (await res.json()) as GraphResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Subgraph response missing data");
  }
  return json.data;
}

function toNumber(value?: string | number | null, decimals = 18): number {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 10 ** decimals;
}

function toInt(value?: string | number | null, divisor = 1): number {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.floor(numeric / divisor);
}

function toIso(seconds?: string | number | null): string {
  if (!seconds) return "";
  const numeric = typeof seconds === "string" ? Number(seconds) : seconds;
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return new Date(numeric * 1000).toISOString();
}

function normalizeAddress(value?: string | null) {
  return value ? value.toLowerCase() : undefined;
}

function getTokenInfo(address?: string | null) {
  const normalized = normalizeAddress(address) ?? ZERO_ADDRESS;
  return TOKEN_METADATA[normalized] ?? getTokenMetadata(normalized);
}

function createEmptyReviewerMetrics(): ReviewerMetrics {
  return {
    totalReviews: 0,
    concludedReviews: 0,
    accurateReviews: 0,
    accuracyRate: 0,
    disputesDefended: 0,
    queuedRewards: [],
  };
}

type GraphTask = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  category: string;
  deadline: string;
  reward: string;
  rewardToken: string;
  status: string;
  createdAt: string;
  submissionGuard?: string | null;
  reviewGuard?: string | null;
  adoptionStrategy?: string | null;
  submissionCount: string;
  activeSubmissionCount: string;
  publisher: { id: string };
  submissions: Array<{
    id: string;
    submissionId: string;
    status: string;
    submittedAt: string;
    approveCount: string;
    rejectCount: string;
    contentHash: string;
    submitter: { id: string };
  }>;
};

type GraphSubmission = {
  id: string;
  submissionId: string;
  status: string;
  submittedAt: string;
  approveCount: string;
  rejectCount: string;
  task: {
    id: string;
    title: string;
    deadline: string;
    reviewGuard?: string | null;
  };
  submitter: { id: string };
};

type GraphArbitration = {
  id: string;
  arbitrationId: string;
  arbitrationType: string;
  status: string;
  requestedAt: string;
  resolvedAt?: string | null;
  feeAmount: string;
  feeToken?: string | null;
  targetId: string;
  evidence?: string | null;
  requester: { id: string };
};

type GraphGlobalStatistic = {
  totalTasks: string;
  totalSubmissions: string;
  totalReviews: string;
  totalUsers: string;
  activeTasks: string;
  activeSubmissions: string;
  pendingArbitrations: string;
  totalRewardsDistributed: string;
  totalFeesCollected: string;
};

type GraphDailyStatistic = {
  id: string;
  date: string;
  tasksCreated: string;
  submissionsCreated: string;
  submissionsAdopted?: string;
  reviewsSubmitted: string;
  usersRegistered?: string;
  totalRewardsDistributed?: string;
};

type GraphUser = {
  id: string;
  reputation: string;
  status: string;
  stakedAmount: string;
  taskCount: string;
  submissionCount: string;
  reviewCount: string;
  adoptedSubmissionCount: string;
  categoryScores: Array<{ category: string; score: string }>;
};

type GraphReviewerSummary = {
  outcome: string;
  submission: {
    id: string;
    status: string;
  };
};

type GraphReviewerReward = {
  reviewerShare: string;
  task: {
    rewardToken: string;
  };
  submission: {
    id: string;
    approveCount: string;
    rejectCount: string;
  };
};

function mapTask(task: GraphTask): Task {
  const tokenInfo = getTokenInfo(task.rewardToken);
  const reward = toNumber(task.reward, tokenInfo.decimals);
  const submissionGuard = normalizeAddress(task.submissionGuard ?? undefined);
  const reviewGuard = normalizeAddress(task.reviewGuard ?? undefined);

  const guardTags = [] as string[];
  if (submissionGuard) {
    guardTags.push(`Submission ${formatAddress(submissionGuard)}`);
  }
  if (reviewGuard) {
    guardTags.push(`Review ${formatAddress(reviewGuard)}`);
  }

  const strategyAddress = normalizeAddress(task.adoptionStrategy ?? undefined);
  const fallbackStrategy = getAdoptionStrategyFallback(strategyAddress);

  const minReviews = fallbackStrategy?.minReviews ?? 0;
  const approvalThreshold = fallbackStrategy?.approvalThreshold ?? 0;
  const rejectionThreshold = fallbackStrategy?.rejectionThreshold ?? 0;
  const allowTimeBasedAdoption = fallbackStrategy?.allowTimeBasedAdoption ?? false;
  const autoAdoptAfterHours =
    allowTimeBasedAdoption && fallbackStrategy?.autoAdoptionHours
      ? fallbackStrategy.autoAdoptionHours
      : undefined;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    requirements: task.requirements,
    category: task.category,
    status: task.status as Task["status"],
    reward,
    token: tokenInfo.symbol,
    rewardTokenAddress: normalizeAddress(task.rewardToken),
    deadline: toIso(task.deadline),
    release: toIso(task.createdAt),
    guardTags,
    publisher: { address: task.publisher.id },
    submissions: task.submissions.map((submission) => ({
      id: submission.id,
      contractId: submission.submissionId,
      version: 0,
      author: submission.submitter.id,
      avatarSeed: submission.submitter.id,
      submittedAt: toIso(submission.submittedAt),
      status: submission.status as SubmissionStatus,
      approveCount: Number(submission.approveCount ?? 0),
      rejectCount: Number(submission.rejectCount ?? 0),
      summary: submission.contentHash,
      attachments: 0,
      contentHash: submission.contentHash,
    })),
    submissionCount: Number(task.submissionCount ?? 0),
    activeSubmissionCount: Number(task.activeSubmissionCount ?? 0),
    guards: {
      submission: { address: submissionGuard },
      review: { address: reviewGuard },
    },
    adoptionStrategy: {
      minReviews,
      approvalThreshold,
      rejectionThreshold,
      allowTimeBasedAdoption,
      autoAdoptAfterHours,
    },
    adoptionStrategyAddress: strategyAddress ?? null,
  };
}

function mapReviewQueue(submission: GraphSubmission): ReviewQueueItem {
  return {
    id: submission.id,
    taskId: submission.task.id,
    submissionId: submission.submissionId,
    title: submission.task.title,
    author: submission.submitter.id,
    status: submission.status as SubmissionStatus,
    deadline: toIso(submission.task.deadline),
    guard: submission.task.reviewGuard ? formatAddress(submission.task.reviewGuard) : "",
  };
}

function mapArbitration(arbitration: GraphArbitration): ArbitrationCase {
  const tokenInfo = getTokenInfo(arbitration.feeToken ?? ZERO_ADDRESS);
  return {
    id: arbitration.id,
    arbitrationId: arbitration.arbitrationId,
    type: arbitration.arbitrationType,
    typeKey: arbitration.arbitrationType,
    status: arbitration.status as ArbitrationStatus,
    filedAt: toIso(arbitration.requestedAt),
    resolvedAt: toIso(arbitration.resolvedAt ?? undefined) || null,
    requester: arbitration.requester.id,
    targetId: arbitration.targetId,
    fee: toNumber(arbitration.feeAmount, tokenInfo.decimals),
    feeTokenSymbol: tokenInfo.symbol,
    summary: arbitration.evidence ?? undefined,
    evidence: arbitration.evidence ?? null,
  };
}

function computeSbtLevel(reputation: number): string {
  if (reputation >= 800) return "Atlas III";
  if (reputation >= 600) return "Atlas II";
  if (reputation >= 400) return "Atlas I";
  if (reputation > 0) return "Explorer";
  return "Uninitialized";
}

function mapUser(user: GraphUser | null | undefined): HermisUser {
  if (!user) {
    return {
      address: "",
      username: "",
      reputation: 0,
      stake: 0,
      state: "UNINITIALIZED",
      sbtLevel: "Uninitialized",
      pendingRewards: 0,
      categoryScores: [],
      reputationHistory: [],
    };
  }

  const address = user.id.toLowerCase();
  const reputationRaw = toInt(user.reputation, 10);
  const stake = toNumber(user.stakedAmount, 18);
  const categoryScores = (user.categoryScores ?? []).map((entry) => ({
    label: entry.category,
    value: toInt(entry.score, 10),
  }));

  return {
    address,
    username: formatAddress(address) || address,
    reputation: reputationRaw,
    stake,
    state: user.status ?? "UNINITIALIZED",
    sbtLevel: computeSbtLevel(reputationRaw),
    pendingRewards: 0,
    categoryScores,
    reputationHistory: [],
  };
}

export async function loadTasks(limit = 20): Promise<Task[]> {
  const query = /* GraphQL */ `
    query Tasks($limit: Int!) {
      tasks(first: $limit, orderBy: createdAt, orderDirection: desc) {
        id
        title
        description
        requirements
        category
        deadline
        reward
        rewardToken
        status
        createdAt
        submissionGuard
        reviewGuard
        adoptionStrategy
        submissionCount
        activeSubmissionCount
        publisher {
          id
        }
        submissions(first: 5, orderBy: submittedAt, orderDirection: desc) {
          id
          submissionId
          status
          submittedAt
          approveCount
          rejectCount
          contentHash
          submitter {
            id
          }
        }
      }
    }
  `;

  try {
    const data = await graphRequest<{ tasks: GraphTask[] }>(query, { limit });
    return data.tasks.map(mapTask);
  } catch (error) {
    console.error("loadTasks failed", error);
    return [];
  }
}

export async function loadTaskDetail(taskId: string): Promise<Task | null> {
  const query = /* GraphQL */ `
    query TaskDetail($id: ID!) {
      task(id: $id) {
        id
        title
        description
        requirements
        category
        deadline
        reward
        rewardToken
        status
        createdAt
        submissionGuard
        reviewGuard
        adoptionStrategy
        submissionCount
        activeSubmissionCount
        publisher {
          id
        }
        submissions(orderBy: submittedAt, orderDirection: desc) {
          id
          submissionId
          status
          submittedAt
          approveCount
          rejectCount
          contentHash
          submitter {
            id
          }
        }
      }
    }
  `;

  try {
    const data = await graphRequest<{ task: GraphTask | null }>(query, { id: taskId });
    return data.task ? mapTask(data.task) : null;
  } catch (error) {
    console.error("loadTaskDetail failed", error);
    return null;
  }
}

export async function loadUser(address?: string): Promise<HermisUser> {
  if (!address) {
    return mapUser(null);
  }

  const query = /* GraphQL */ `
    query User($id: ID!) {
      user(id: $id) {
        id
        reputation
        status
        stakedAmount
        taskCount
        submissionCount
        reviewCount
        adoptedSubmissionCount
        categoryScores {
          category
          score
        }
      }
    }
  `;

  try {
    const data = await graphRequest<{ user: GraphUser | null }>(query, {
      id: address.toLowerCase(),
    });
    return mapUser(data.user);
  } catch (error) {
    console.error("loadUser failed", error);
    return mapUser(null);
  }
}

export async function loadReviewQueues(
  limit = 20,
  statuses: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW"]
): Promise<ReviewQueueItem[]> {
  const query = /* GraphQL */ `
    query ReviewQueues($limit: Int!, $statuses: [SubmissionStatus!]) {
      submissions(
        first: $limit
        orderBy: submittedAt
        orderDirection: desc
        where: { status_in: $statuses }
      ) {
        id
        submissionId
        status
        submittedAt
        approveCount
        rejectCount
        submitter {
          id
        }
        task {
          id
          title
          deadline
          reviewGuard
        }
      }
    }
  `;

  const data = await graphRequest<{ submissions: GraphSubmission[] }>(query, {
    limit,
    statuses,
  });
  return data.submissions.map(mapReviewQueue);
}

export async function loadReviewerMetrics(address?: string): Promise<ReviewerMetrics> {
  if (!address) {
    return createEmptyReviewerMetrics();
  }

  const normalized = address.toLowerCase();

  const query = /* GraphQL */ `
    query ReviewerMetrics($id: ID!, $reviewer: String!) {
      user(id: $id) {
        reviewCount
      }
      reviews(
        first: 30
        orderBy: reviewedAt
        orderDirection: desc
        where: { reviewer: $reviewer }
      ) {
        outcome
        submission {
          id
          status
        }
      }
      arbitrations(where: { requester: $reviewer, status_in: [APPROVED, DISMISSED] }) {
        id
      }
    }
  `;

  try {
    const data = await graphRequest<{
      user: { reviewCount: string } | null;
      reviews: GraphReviewerSummary[];
      arbitrations: Array<{ id: string }>;
    }>(query, {
      id: normalized,
      reviewer: normalized,
    });

    const totalReviews = Number(data.user?.reviewCount ?? 0);
    const recentReviews = data.reviews ?? [];
    const concludedReviews = recentReviews.filter((entry) =>
      entry.submission?.status ? ["ADOPTED", "REMOVED"].includes(entry.submission.status) : false
    );
    const accurateReviews = concludedReviews.filter((entry) => {
      const status = entry.submission?.status ?? "";
      if (status === "ADOPTED") {
        return entry.outcome === "APPROVE";
      }
      if (status === "REMOVED") {
        return entry.outcome === "REJECT";
      }
      return false;
    });
    const accuracyDenominator = concludedReviews.length;
    const rawAccuracy =
      accuracyDenominator > 0 ? (accurateReviews.length / accuracyDenominator) * 100 : 0;
    const accuracyRate = Math.min(100, Math.max(0, Math.round(rawAccuracy)));

    const disputesDefended = data.arbitrations?.length ?? 0;

    const rewardAccumulator = new Map<string, { symbol: string; amount: number }>();
    let rewardDistributions: GraphReviewerReward[] = [];
    const submissionIds = Array.from(
      new Set(
        recentReviews.map((entry) => entry.submission?.id).filter((id): id is string => Boolean(id))
      )
    ).slice(0, 50);

    if (submissionIds.length > 0) {
      try {
        const rewardsQuery = /* GraphQL */ `
          query ReviewerRewards($submissionIds: [String!], $first: Int!) {
            rewardDistributions(first: $first, where: { submission_in: $submissionIds }) {
              reviewerShare
              task {
                rewardToken
              }
              submission {
                id
                approveCount
                rejectCount
              }
            }
          }
        `;

        const rewardData = await graphRequest<{ rewardDistributions: GraphReviewerReward[] }>(
          rewardsQuery,
          {
            submissionIds,
            first: 100,
          }
        );
        rewardDistributions = rewardData.rewardDistributions ?? [];
      } catch (rewardsError) {
        console.error("loadReviewerMetrics rewards fetch failed", rewardsError);
      }
    }

    for (const distribution of rewardDistributions) {
      const tokenInfo = getTokenInfo(distribution.task?.rewardToken);
      const reviewerShareTotal = toNumber(distribution.reviewerShare, tokenInfo.decimals);
      const approveCount = Number(distribution.submission?.approveCount ?? 0);
      const rejectCount = Number(distribution.submission?.rejectCount ?? 0);
      const reviewCount = approveCount + rejectCount;
      if (reviewerShareTotal <= 0 || reviewCount <= 0) {
        continue;
      }
      const estimatedShare = reviewerShareTotal / reviewCount;
      if (estimatedShare <= 0) {
        continue;
      }
      const existing = rewardAccumulator.get(tokenInfo.symbol);
      rewardAccumulator.set(tokenInfo.symbol, {
        symbol: tokenInfo.symbol,
        amount: (existing?.amount ?? 0) + estimatedShare,
      });
    }

    return {
      totalReviews,
      concludedReviews: concludedReviews.length,
      accurateReviews: accurateReviews.length,
      accuracyRate,
      disputesDefended,
      queuedRewards: Array.from(rewardAccumulator.values()),
    };
  } catch (error) {
    console.error("loadReviewerMetrics failed", error);
    return createEmptyReviewerMetrics();
  }
}

export async function loadArbitrations(
  limit = 20,
  statuses: ArbitrationStatus[] = ["PENDING", "APPROVED", "REJECTED", "DISMISSED"]
): Promise<ArbitrationCase[]> {
  const query = /* GraphQL */ `
    query Arbitrations($limit: Int!, $statuses: [ArbitrationStatus!]) {
      arbitrations(
        first: $limit
        orderBy: requestedAt
        orderDirection: desc
        where: { status_in: $statuses }
      ) {
        id
        arbitrationId
        arbitrationType
        status
        requestedAt
        resolvedAt
        feeAmount
        feeToken
        targetId
        evidence
        requester {
          id
        }
      }
    }
  `;

  const data = await graphRequest<{ arbitrations: GraphArbitration[] }>(query, {
    limit,
    statuses,
  });
  return data.arbitrations.map(mapArbitration);
}

export async function loadGlobalStatistics() {
  const query = /* GraphQL */ `
    query GlobalStatistic {
      globalStatistic(id: "global") {
        totalTasks
        totalSubmissions
        totalReviews
        totalUsers
        activeTasks
        activeSubmissions
        pendingArbitrations
        totalRewardsDistributed
        totalFeesCollected
      }
    }
  `;

  const data = await graphRequest<{ globalStatistic: GraphGlobalStatistic | null }>(query);
  const stats = data.globalStatistic;
  if (!stats) {
    return {
      totalTasks: 0,
      totalSubmissions: 0,
      totalReviews: 0,
      totalUsers: 0,
      activeTasks: 0,
      activeSubmissions: 0,
      pendingArbitrations: 0,
      totalRewardsDistributed: 0,
      totalFeesCollected: 0,
    };
  }

  const rewards = toNumber(stats.totalRewardsDistributed, 18);
  const fees = toNumber(stats.totalFeesCollected, 18);

  return {
    totalTasks: Number(stats.totalTasks ?? 0),
    totalSubmissions: Number(stats.totalSubmissions ?? 0),
    totalReviews: Number(stats.totalReviews ?? 0),
    totalUsers: Number(stats.totalUsers ?? 0),
    activeTasks: Number(stats.activeTasks ?? 0),
    activeSubmissions: Number(stats.activeSubmissions ?? 0),
    pendingArbitrations: Number(stats.pendingArbitrations ?? 0),
    totalRewardsDistributed: rewards,
    totalFeesCollected: fees,
  };
}

export async function loadDailyStatistics(limit = 30, order: "asc" | "desc" = "asc") {
  const query = /* GraphQL */ `
    query Daily($limit: Int!, $order: OrderDirection!) {
      dailyStatistics(first: $limit, orderBy: date, orderDirection: $order) {
        id
        date
        tasksCreated
        submissionsCreated
        submissionsAdopted
        reviewsSubmitted
        totalRewardsDistributed
      }
    }
  `;

  const data = await graphRequest<{ dailyStatistics: GraphDailyStatistic[] }>(query, {
    limit,
    order,
  });

  return data.dailyStatistics.map((item) => ({
    id: item.id,
    date: item.date,
    timestamp:
      Number.isFinite(Number(item.date)) && Number(item.date) > 1000000
        ? Number(item.date)
        : Date.parse(item.date) / 1000,
    tasksCreated: Number(item.tasksCreated ?? 0),
    submissionsCreated: Number(item.submissionsCreated ?? 0),
    submissionsAdopted: Number(item.submissionsAdopted ?? 0),
    reviewsSubmitted: Number(item.reviewsSubmitted ?? 0),
    totalRewardsDistributed: toNumber(item.totalRewardsDistributed ?? 0, 18),
  }));
}

export async function loadAllowedGuards(): Promise<string[]> {
  return [
    CONTRACT_ADDRESSES.SUBMISSION_GUARD,
    CONTRACT_ADDRESSES.REVIEW_GUARD,
    CONTRACT_ADDRESSES.GLOBAL_GUARD,
  ];
}

export async function loadAllowedStrategies(): Promise<string[]> {
  return [CONTRACT_ADDRESSES.SIMPLE_ADOPTION_STRATEGY, CONTRACT_ADDRESSES.BASIC_REWARD_STRATEGY];
}

export async function loadAllowedTokens(): Promise<string[]> {
  return [ZERO_ADDRESS, ...Object.keys(TOKEN_METADATA)];
}
