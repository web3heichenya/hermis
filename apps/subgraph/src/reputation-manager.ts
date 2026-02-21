import { BigInt } from "@graphprotocol/graph-ts";
import {
  UserInitialized as UserInitializedEvent,
  ReputationChanged as ReputationChangedEvent,
  UserStatusChanged as UserStatusChangedEvent,
  UserStaked as UserStakedEvent,
  UnstakeRequested as UnstakeRequestedEvent,
  UserUnstaked as UserUnstakedEvent,
  CategoryScoreClaimed as CategoryScoreClaimedEvent,
} from "../generated/ReputationManager/ReputationManager";
import { User, CategoryScore, UserEvent } from "../generated/schema";
import {
  getOrCreateUser,
  getOrCreateDailyStatistic,
  getOrCreateGlobalStatistic,
  updateUserActivity,
  userStatusToString,
  createEntityId,
} from "./utils";

export function handleUserInitialized(event: UserInitializedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.reputation = event.params.initialReputation;
  user.status = "NORMAL";
  user.initializedAt = event.block.timestamp;
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "INITIALIZED";
  userEvent.user = user.id;
  userEvent.data = `{"initialReputation":"${event.params.initialReputation.toString()}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.usersRegistered = dailyStats.usersRegistered.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalUsers = globalStats.totalUsers.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleReputationChanged(event: ReputationChangedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.reputation = event.params.newReputation;
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "REPUTATION_CHANGED";
  userEvent.user = user.id;
  userEvent.data = `{"change":"${event.params.change.toString()}","newReputation":"${event.params.newReputation.toString()}","reason":"${event.params.reason}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}

export function handleUserStatusChanged(event: UserStatusChangedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.status = userStatusToString(event.params.newStatus);
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "STATUS_CHANGED";
  userEvent.user = user.id;
  userEvent.data = `{"oldStatus":"${userStatusToString(event.params.oldStatus)}","newStatus":"${userStatusToString(event.params.newStatus)}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}

export function handleUserStaked(event: UserStakedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.stakedAmount = user.stakedAmount.plus(event.params.amount);
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "STAKED";
  userEvent.user = user.id;
  userEvent.data = `{"amount":"${event.params.amount.toString()}","token":"${event.params.token.toHexString()}","totalStaked":"${user.stakedAmount.toString()}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}

export function handleUnstakeRequested(event: UnstakeRequestedEvent): void {
  let user = getOrCreateUser(event.params.user);
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "UNSTAKE_REQUESTED";
  userEvent.user = user.id;
  userEvent.data = `{"unlockTime":"${event.params.unlockTime.toString()}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}

export function handleUserUnstaked(event: UserUnstakedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.stakedAmount = user.stakedAmount.minus(event.params.amount);
  updateUserActivity(user, event.block.timestamp);

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "UNSTAKED";
  userEvent.user = user.id;
  userEvent.data = `{"amount":"${event.params.amount.toString()}","token":"${event.params.token.toHexString()}","remainingStaked":"${user.stakedAmount.toString()}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}

export function handleCategoryScoreClaimed(event: CategoryScoreClaimedEvent): void {
  let user = getOrCreateUser(event.params.user);
  updateUserActivity(user, event.block.timestamp);

  // Get or create category score
  let categoryScoreId = user.id + "_" + event.params.category;
  let categoryScore = CategoryScore.load(categoryScoreId);

  if (categoryScore == null) {
    categoryScore = new CategoryScore(categoryScoreId);
    categoryScore.user = user.id;
    categoryScore.category = event.params.category;
    categoryScore.score = BigInt.zero();
    categoryScore.pendingScore = BigInt.zero();
    categoryScore.lastClaimAt = BigInt.zero();
    categoryScore.lastUpdatedAt = BigInt.zero();
  }

  categoryScore.score = event.params.newScore;
  categoryScore.pendingScore = categoryScore.pendingScore.minus(event.params.scoreIncrease);
  categoryScore.lastClaimAt = event.block.timestamp;
  categoryScore.lastUpdatedAt = event.block.timestamp;
  categoryScore.save();

  // Create user event
  let userEvent = new UserEvent(createEntityId(event.transaction.hash, event.logIndex));
  userEvent.type = "CATEGORY_SCORE_CLAIMED";
  userEvent.user = user.id;
  userEvent.data = `{"category":"${event.params.category}","scoreIncrease":"${event.params.scoreIncrease.toString()}","newScore":"${event.params.newScore.toString()}"}`;
  userEvent.timestamp = event.block.timestamp;
  userEvent.blockNumber = event.block.number;
  userEvent.transactionHash = event.transaction.hash;
  userEvent.save();
}