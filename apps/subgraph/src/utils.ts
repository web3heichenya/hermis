import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { User, DailyStatistic, GlobalStatistic } from "../generated/schema";

// Constants
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const SECONDS_PER_DAY = BigInt.fromI32(86400);

// Utility functions
export function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHexString());

  if (user === null) {
    user = new User(address.toHexString());
    user.address = address;
    user.reputation = BigInt.fromI32(1000); // Default reputation with 10x precision (100.0)
    user.status = "UNINITIALIZED";
    user.stakedAmount = BigInt.zero();
    user.initializedAt = BigInt.zero();
    user.lastActivityAt = BigInt.zero();

    // Initialize statistics
    user.taskCount = BigInt.zero();
    user.submissionCount = BigInt.zero();
    user.reviewCount = BigInt.zero();
    user.adoptedSubmissionCount = BigInt.zero();
    user.accurateReviewCount = BigInt.zero();

    user.sbtTokenId = null;

    user.save();
  }

  return user;
}

export function getDayId(timestamp: BigInt): string {
  let dayTimestamp = timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);
  return dayTimestamp.toString();
}

export function getOrCreateDailyStatistic(timestamp: BigInt): DailyStatistic {
  let dayId = getDayId(timestamp);
  let dailyStats = DailyStatistic.load(dayId);

  if (dailyStats === null) {
    dailyStats = new DailyStatistic(dayId);
    dailyStats.date = timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);

    // Initialize all counters to zero
    dailyStats.tasksCreated = BigInt.zero();
    dailyStats.tasksPublished = BigInt.zero();
    dailyStats.tasksCompleted = BigInt.zero();
    dailyStats.tasksCancelled = BigInt.zero();
    dailyStats.tasksExpired = BigInt.zero();

    dailyStats.submissionsCreated = BigInt.zero();
    dailyStats.submissionsAdopted = BigInt.zero();
    dailyStats.submissionsRemoved = BigInt.zero();

    dailyStats.reviewsSubmitted = BigInt.zero();

    dailyStats.usersRegistered = BigInt.zero();
    dailyStats.activeUsers = BigInt.zero();

    dailyStats.totalRewardsDistributed = BigInt.zero();
    dailyStats.totalFeesCollected = BigInt.zero();

    dailyStats.save();
  }

  return dailyStats;
}

export function getOrCreateGlobalStatistic(): GlobalStatistic {
  let globalStats = GlobalStatistic.load("global");

  if (globalStats === null) {
    globalStats = new GlobalStatistic("global");

    // Initialize all counters to zero
    globalStats.totalTasks = BigInt.zero();
    globalStats.totalSubmissions = BigInt.zero();
    globalStats.totalReviews = BigInt.zero();
    globalStats.totalUsers = BigInt.zero();
    globalStats.totalArbitrations = BigInt.zero();

    globalStats.activeTasks = BigInt.zero();
    globalStats.activeSubmissions = BigInt.zero();
    globalStats.pendingArbitrations = BigInt.zero();

    globalStats.totalRewardsDistributed = BigInt.zero();
    globalStats.totalFeesCollected = BigInt.zero();

    globalStats.lastUpdated = BigInt.zero();

    globalStats.save();
  }

  return globalStats;
}

export function updateUserActivity(user: User, timestamp: BigInt): void {
  user.lastActivityAt = timestamp;
  user.save();
}

export function taskStatusToString(status: i32): string {
  if (status == 0) return "DRAFT";
  if (status == 1) return "PUBLISHED";
  if (status == 2) return "ACTIVE";
  if (status == 3) return "COMPLETED";
  if (status == 4) return "CANCELLED";
  if (status == 5) return "EXPIRED";
  return "UNKNOWN";
}

export function submissionStatusToString(status: i32): string {
  if (status == 0) return "SUBMITTED";
  if (status == 1) return "UNDER_REVIEW";
  if (status == 2) return "NORMAL";
  if (status == 3) return "ADOPTED";
  if (status == 4) return "REMOVED";
  return "UNKNOWN";
}

export function userStatusToString(status: i32): string {
  if (status == 0) return "UNINITIALIZED";
  if (status == 1) return "NORMAL";
  if (status == 2) return "AT_RISK";
  if (status == 3) return "BLACKLISTED";
  return "UNKNOWN";
}

export function reviewOutcomeToString(outcome: i32): string {
  if (outcome == 0) return "APPROVE";
  if (outcome == 1) return "REJECT";
  return "UNKNOWN";
}

export function arbitrationTypeToString(arbitrationType: i32): string {
  if (arbitrationType == 0) return "USER_REPUTATION";
  if (arbitrationType == 1) return "SUBMISSION_STATUS";
  return "UNKNOWN";
}

export function arbitrationStatusToString(status: i32): string {
  if (status == 0) return "PENDING";
  if (status == 1) return "APPROVED";
  if (status == 2) return "REJECTED";
  if (status == 3) return "DISMISSED";
  return "UNKNOWN";
}

export function createEntityId(transactionHash: Bytes, logIndex: BigInt): string {
  return transactionHash.toHexString() + "_" + logIndex.toString();
}