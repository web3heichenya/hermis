import { BigInt } from "@graphprotocol/graph-ts";
import {
  ArbitrationRequested as ArbitrationRequestedEvent,
  ArbitrationResolved as ArbitrationResolvedEvent,
  ArbitrationFeeRefunded as ArbitrationFeeRefundedEvent,
  ArbitrationFeeForfeited as ArbitrationFeeForfeitedEvent,
} from "../generated/ArbitrationManager/ArbitrationManager";
import { Arbitration } from "../generated/schema";
import {
  getOrCreateUser,
  getOrCreateDailyStatistic,
  getOrCreateGlobalStatistic,
  updateUserActivity,
  arbitrationTypeToString,
  arbitrationStatusToString,
  createEntityId,
} from "./utils";

export function handleArbitrationRequested(event: ArbitrationRequestedEvent): void {
  // Create arbitration entity
  let arbitration = new Arbitration(event.params.arbitrationId.toString());
  arbitration.arbitrationId = event.params.arbitrationId;
  arbitration.requester = getOrCreateUser(event.params.requester).id;
  arbitration.arbitrationType = arbitrationTypeToString(event.params.arbitrationType);
  arbitration.targetId = event.params.targetId;
  arbitration.evidence = event.params.evidence;
  arbitration.feeAmount = event.params.depositAmount;
  arbitration.feeToken = null; // Fee token is not in the event anymore
  arbitration.status = "PENDING";
  arbitration.resolution = null;
  arbitration.resolvedBy = null;
  arbitration.requestedAt = event.block.timestamp;
  arbitration.resolvedAt = null;

  // Block info
  arbitration.blockNumber = event.block.number;
  arbitration.blockTimestamp = event.block.timestamp;
  arbitration.transactionHash = event.transaction.hash;

  arbitration.save();

  // Update requester activity
  let user = getOrCreateUser(event.params.requester);
  updateUserActivity(user, event.block.timestamp);

  // Update statistics
  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalArbitrations = globalStats.totalArbitrations.plus(BigInt.fromI32(1));
  globalStats.pendingArbitrations = globalStats.pendingArbitrations.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleArbitrationResolved(event: ArbitrationResolvedEvent): void {
  let arbitration = Arbitration.load(event.params.arbitrationId.toString());
  if (arbitration == null) {
    return;
  }

  arbitration.status = arbitrationStatusToString(event.params.decision);
  arbitration.resolution = event.params.reason;
  arbitration.resolvedBy = event.params.resolver;
  arbitration.resolvedAt = event.params.resolvedAt;
  arbitration.save();

  // Update statistics
  let globalStats = getOrCreateGlobalStatistic();
  globalStats.pendingArbitrations = globalStats.pendingArbitrations.minus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleArbitrationFeeRefunded(event: ArbitrationFeeRefundedEvent): void {
  // This event indicates successful arbitration (user gets refund)
  // Update statistics for fees
  let globalStats = getOrCreateGlobalStatistic();
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Update user activity
  let user = getOrCreateUser(event.params.recipient);
  updateUserActivity(user, event.block.timestamp);
}

export function handleArbitrationFeeForfeited(event: ArbitrationFeeForfeitedEvent): void {
  // This event indicates rejected arbitration (fee is kept by platform)
  // Update statistics for fees
  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalFeesCollected = globalStats.totalFeesCollected.plus(event.params.amount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}