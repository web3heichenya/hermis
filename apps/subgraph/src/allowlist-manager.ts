import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  GuardAllowed,
  GuardDisallowed,
  StrategyAllowed,
  StrategyDisallowed,
  TokenAllowed,
  TokenDisallowed,
} from "../generated/AllowlistManager/AllowlistManager";
import { AllowedGuard, AllowedStrategy, AllowedToken } from "../generated/schema";

// Guard Events
export function handleGuardAllowed(event: GuardAllowed): void {
  let id = event.params.guard.toHexString();
  let allowedGuard = AllowedGuard.load(id);

  if (allowedGuard === null) {
    allowedGuard = new AllowedGuard(id);
    allowedGuard.address = event.params.guard;
    allowedGuard.addedAt = event.block.timestamp;
    allowedGuard.removedAt = null;
  } else {
    // Re-allowing a previously disallowed guard
    allowedGuard.addedAt = event.block.timestamp;
    allowedGuard.removedAt = null;
  }

  allowedGuard.isAllowed = true;
  allowedGuard.blockNumber = event.block.number;
  allowedGuard.transactionHash = event.transaction.hash;
  allowedGuard.save();
}

export function handleGuardDisallowed(event: GuardDisallowed): void {
  let id = event.params.guard.toHexString();
  let allowedGuard = AllowedGuard.load(id);

  if (allowedGuard !== null) {
    allowedGuard.isAllowed = false;
    allowedGuard.removedAt = event.block.timestamp;
    allowedGuard.blockNumber = event.block.number;
    allowedGuard.transactionHash = event.transaction.hash;
    allowedGuard.save();
  }
}

// Strategy Events
export function handleStrategyAllowed(event: StrategyAllowed): void {
  let id = event.params.strategy.toHexString();
  let allowedStrategy = AllowedStrategy.load(id);

  if (allowedStrategy === null) {
    allowedStrategy = new AllowedStrategy(id);
    allowedStrategy.address = event.params.strategy;
    allowedStrategy.addedAt = event.block.timestamp;
    allowedStrategy.removedAt = null;
  } else {
    // Re-allowing a previously disallowed strategy
    allowedStrategy.addedAt = event.block.timestamp;
    allowedStrategy.removedAt = null;
  }

  allowedStrategy.isAllowed = true;
  allowedStrategy.blockNumber = event.block.number;
  allowedStrategy.transactionHash = event.transaction.hash;
  allowedStrategy.save();
}

export function handleStrategyDisallowed(event: StrategyDisallowed): void {
  let id = event.params.strategy.toHexString();
  let allowedStrategy = AllowedStrategy.load(id);

  if (allowedStrategy !== null) {
    allowedStrategy.isAllowed = false;
    allowedStrategy.removedAt = event.block.timestamp;
    allowedStrategy.blockNumber = event.block.number;
    allowedStrategy.transactionHash = event.transaction.hash;
    allowedStrategy.save();
  }
}

// Token Events
export function handleTokenAllowed(event: TokenAllowed): void {
  let id = event.params.token.toHexString();
  let allowedToken = AllowedToken.load(id);

  if (allowedToken === null) {
    allowedToken = new AllowedToken(id);
    allowedToken.address = event.params.token;
    allowedToken.addedAt = event.block.timestamp;
    allowedToken.removedAt = null;
  } else {
    // Re-allowing a previously disallowed token
    allowedToken.addedAt = event.block.timestamp;
    allowedToken.removedAt = null;
  }

  allowedToken.isAllowed = true;
  allowedToken.blockNumber = event.block.number;
  allowedToken.transactionHash = event.transaction.hash;
  allowedToken.save();
}

export function handleTokenDisallowed(event: TokenDisallowed): void {
  let id = event.params.token.toHexString();
  let allowedToken = AllowedToken.load(id);

  if (allowedToken !== null) {
    allowedToken.isAllowed = false;
    allowedToken.removedAt = event.block.timestamp;
    allowedToken.blockNumber = event.block.number;
    allowedToken.transactionHash = event.transaction.hash;
    allowedToken.save();
  }
}
