import { BigInt } from "@graphprotocol/graph-ts";
import {
  SBTMinted as SBTMintedEvent,
  ReputationUpdated as ReputationUpdatedEvent,
  CategoryScoreUpdated as CategoryScoreUpdatedEvent,
  StakeAmountUpdated as StakeAmountUpdatedEvent,
} from "../generated/HermisSBT/HermisSBT";
import { User, CategoryScore } from "../generated/schema";
import {
  getOrCreateUser,
  updateUserActivity,
  userStatusToString,
} from "./utils";

export function handleSBTMinted(event: SBTMintedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.sbtTokenId = event.params.tokenId;
  updateUserActivity(user, event.block.timestamp);
}

export function handleReputationUpdatedSBT(event: ReputationUpdatedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.reputation = event.params.newReputation;
  user.status = userStatusToString(event.params.newStatus);
  updateUserActivity(user, event.block.timestamp);
}

export function handleCategoryScoreUpdatedSBT(event: CategoryScoreUpdatedEvent): void {
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
  categoryScore.lastUpdatedAt = event.block.timestamp;
  categoryScore.save();
}

export function handleStakeAmountUpdatedSBT(event: StakeAmountUpdatedEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.stakedAmount = event.params.newStakeAmount;
  updateUserActivity(user, event.block.timestamp);
}