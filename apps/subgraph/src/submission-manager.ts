import { BigInt } from "@graphprotocol/graph-ts";
import {
  SubmissionCreated as SubmissionCreatedEvent,
  SubmissionUpdated as SubmissionUpdatedEvent,
  SubmissionStatusChanged as SubmissionStatusChangedEvent,
  SubmissionAdopted as SubmissionAdoptedEvent,
  ReviewSubmitted as ReviewSubmittedEvent,
} from "../generated/SubmissionManager/SubmissionManager";
import { Submission, SubmissionVersion, Review, Task, SubmissionEvent } from "../generated/schema";
import {
  getOrCreateUser,
  getOrCreateDailyStatistic,
  getOrCreateGlobalStatistic,
  updateUserActivity,
  submissionStatusToString,
  reviewOutcomeToString,
  createEntityId,
} from "./utils";

export function handleSubmissionCreated(event: SubmissionCreatedEvent): void {
  // Create submission entity
  let submission = new Submission(event.params.submissionId.toString());
  submission.submissionId = event.params.submissionId;
  submission.task = event.params.taskId.toString();
  submission.submitter = getOrCreateUser(event.params.submitter).id;
  submission.contentHash = event.params.contentHash;
  submission.version = event.params.version;
  submission.status = "SUBMITTED";
  submission.approveCount = BigInt.zero();
  submission.rejectCount = BigInt.zero();
  submission.submittedAt = event.block.timestamp;
  submission.lastUpdatedAt = event.block.timestamp;
  submission.adoptedAt = null;

  // Block info
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.transactionHash = event.transaction.hash;

  submission.save();

  // Create first version
  let versionId = submission.id + "_v" + event.params.version.toString();
  let version = new SubmissionVersion(versionId);
  version.submission = submission.id;
  version.version = event.params.version;
  version.contentHash = event.params.contentHash;
  version.createdAt = event.block.timestamp;
  version.blockNumber = event.block.number;
  version.blockTimestamp = event.block.timestamp;
  version.transactionHash = event.transaction.hash;
  version.save();

  // Update user statistics
  let user = getOrCreateUser(event.params.submitter);
  user.submissionCount = user.submissionCount.plus(BigInt.fromI32(1));
  updateUserActivity(user, event.block.timestamp);

  // Update task statistics
  let task = Task.load(event.params.taskId.toString());
  if (task != null) {
    task.submissionCount = task.submissionCount.plus(BigInt.fromI32(1));
    task.activeSubmissionCount = task.activeSubmissionCount.plus(BigInt.fromI32(1));

    // Update task status to ACTIVE if it was PUBLISHED
    if (task.status == "PUBLISHED") {
      task.status = "ACTIVE";
    }

    task.save();
  }

  // Create submission event
  let submissionEvent = new SubmissionEvent(createEntityId(event.transaction.hash, event.logIndex));
  submissionEvent.type = "CREATED";
  submissionEvent.submission = submission.id;
  submissionEvent.data = `{"taskId":"${event.params.taskId.toString()}","contentHash":"${event.params.contentHash}","version":"${event.params.version.toString()}"}`;
  submissionEvent.timestamp = event.block.timestamp;
  submissionEvent.blockNumber = event.block.number;
  submissionEvent.transactionHash = event.transaction.hash;
  submissionEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.submissionsCreated = dailyStats.submissionsCreated.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalSubmissions = globalStats.totalSubmissions.plus(BigInt.fromI32(1));
  globalStats.activeSubmissions = globalStats.activeSubmissions.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleSubmissionUpdated(event: SubmissionUpdatedEvent): void {
  let submission = Submission.load(event.params.submissionId.toString());
  if (submission == null) {
    return;
  }

  submission.contentHash = event.params.newContentHash;
  submission.version = event.params.newVersion;
  submission.lastUpdatedAt = event.params.updatedAt;
  submission.save();

  // Create new version
  let versionId = submission.id + "_v" + event.params.newVersion.toString();
  let version = new SubmissionVersion(versionId);
  version.submission = submission.id;
  version.version = event.params.newVersion;
  version.contentHash = event.params.newContentHash;
  version.createdAt = event.params.updatedAt;
  version.blockNumber = event.block.number;
  version.blockTimestamp = event.block.timestamp;
  version.transactionHash = event.transaction.hash;
  version.save();

  // Create submission event
  let submissionEvent = new SubmissionEvent(createEntityId(event.transaction.hash, event.logIndex));
  submissionEvent.type = "UPDATED";
  submissionEvent.submission = submission.id;
  submissionEvent.data = `{"newContentHash":"${event.params.newContentHash}","newVersion":"${event.params.newVersion.toString()}"}`;
  submissionEvent.timestamp = event.block.timestamp;
  submissionEvent.blockNumber = event.block.number;
  submissionEvent.transactionHash = event.transaction.hash;
  submissionEvent.save();
}

export function handleSubmissionStatusChanged(event: SubmissionStatusChangedEvent): void {
  let submission = Submission.load(event.params.submissionId.toString());
  if (submission == null) {
    return;
  }

  let oldStatus = submission.status;
  submission.status = submissionStatusToString(event.params.newStatus);
  submission.lastUpdatedAt = event.block.timestamp;
  submission.save();

  // Update task active submission count
  let task = Task.load(submission.task);
  if (task != null) {
    // If submission was removed or adopted, decrease active count
    if ((oldStatus == "SUBMITTED" || oldStatus == "UNDER_REVIEW" || oldStatus == "NORMAL") &&
        (submission.status == "ADOPTED" || submission.status == "REMOVED")) {
      task.activeSubmissionCount = task.activeSubmissionCount.minus(BigInt.fromI32(1));
      task.save();
    }
  }

  // Create submission event
  let submissionEvent = new SubmissionEvent(createEntityId(event.transaction.hash, event.logIndex));
  submissionEvent.type = "STATUS_CHANGED";
  submissionEvent.submission = submission.id;
  submissionEvent.data = `{"oldStatus":"${oldStatus}","newStatus":"${submission.status}","reason":"${event.params.reason}"}`;
  submissionEvent.timestamp = event.block.timestamp;
  submissionEvent.blockNumber = event.block.number;
  submissionEvent.transactionHash = event.transaction.hash;
  submissionEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  let globalStats = getOrCreateGlobalStatistic();

  if (submission.status == "ADOPTED") {
    dailyStats.submissionsAdopted = dailyStats.submissionsAdopted.plus(BigInt.fromI32(1));
    globalStats.activeSubmissions = globalStats.activeSubmissions.minus(BigInt.fromI32(1));
  } else if (submission.status == "REMOVED") {
    dailyStats.submissionsRemoved = dailyStats.submissionsRemoved.plus(BigInt.fromI32(1));
    globalStats.activeSubmissions = globalStats.activeSubmissions.minus(BigInt.fromI32(1));
  }

  dailyStats.save();
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleSubmissionAdopted(event: SubmissionAdoptedEvent): void {
  let submission = Submission.load(event.params.submissionId.toString());
  if (submission == null) {
    return;
  }

  submission.adoptedAt = event.params.adoptedAt;
  submission.save();

  // Update submitter statistics
  let userEntity = Submission.load(event.params.submissionId.toString());
  if (userEntity != null) {
    let user = getOrCreateUser(event.params.submitter);
    user.adoptedSubmissionCount = user.adoptedSubmissionCount.plus(BigInt.fromI32(1));
    updateUserActivity(user, event.block.timestamp);
  }

  // Create submission event
  let submissionEvent = new SubmissionEvent(createEntityId(event.transaction.hash, event.logIndex));
  submissionEvent.type = "ADOPTED";
  submissionEvent.submission = submission.id;
  submissionEvent.data = `{"taskId":"${event.params.taskId.toString()}","adoptedAt":"${event.params.adoptedAt.toString()}"}`;
  submissionEvent.timestamp = event.block.timestamp;
  submissionEvent.blockNumber = event.block.number;
  submissionEvent.transactionHash = event.transaction.hash;
  submissionEvent.save();
}

export function handleReviewSubmitted(event: ReviewSubmittedEvent): void {
  // Create review entity
  let review = new Review(event.params.reviewId.toString());
  review.reviewId = event.params.reviewId;
  review.submission = event.params.submissionId.toString();
  review.reviewer = getOrCreateUser(event.params.reviewer).id;
  review.outcome = reviewOutcomeToString(event.params.outcome);
  review.reason = event.params.reason;
  review.reviewedAt = event.block.timestamp;

  // Block info
  review.blockNumber = event.block.number;
  review.blockTimestamp = event.block.timestamp;
  review.transactionHash = event.transaction.hash;

  review.save();

  // Update submission review counts
  let submission = Submission.load(event.params.submissionId.toString());
  if (submission != null) {
    if (review.outcome == "APPROVE") {
      submission.approveCount = submission.approveCount.plus(BigInt.fromI32(1));
    } else if (review.outcome == "REJECT") {
      submission.rejectCount = submission.rejectCount.plus(BigInt.fromI32(1));
    }
    submission.lastUpdatedAt = event.block.timestamp;
    submission.save();

    // Update task review count
    let task = Task.load(submission.task);
    if (task != null) {
      task.reviewCount = task.reviewCount.plus(BigInt.fromI32(1));
      task.save();
    }
  }

  // Update reviewer statistics
  let user = getOrCreateUser(event.params.reviewer);
  user.reviewCount = user.reviewCount.plus(BigInt.fromI32(1));
  updateUserActivity(user, event.block.timestamp);

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.reviewsSubmitted = dailyStats.reviewsSubmitted.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalReviews = globalStats.totalReviews.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}