import { BigInt } from "@graphprotocol/graph-ts";
import {
  TaskCreated as TaskCreatedEvent,
  TaskPublished as TaskPublishedEvent,
  TaskCompleted as TaskCompletedEvent,
  TaskExpiredEvent as TaskExpiredEventEvent,
  TaskCancelled as TaskCancelledEvent,
  TaskGuardsUpdated as TaskGuardsUpdatedEvent,
} from "../generated/TaskManager/TaskManager";
import { Task, TaskEvent } from "../generated/schema";
import {
  getOrCreateUser,
  getOrCreateDailyStatistic,
  getOrCreateGlobalStatistic,
  updateUserActivity,
  taskStatusToString,
  createEntityId,
} from "./utils";

export function handleTaskCreated(event: TaskCreatedEvent): void {
  // Create task entity
  let task = new Task(event.params.taskId.toString());
  task.taskId = event.params.taskId;
  task.publisher = getOrCreateUser(event.params.publisher).id;
  task.title = event.params.title;
  task.description = "";
  task.requirements = "";
  task.category = event.params.category;
  task.deadline = event.params.deadline;
  task.reward = event.params.reward;
  task.rewardToken = event.params.rewardToken;
  task.status = "DRAFT";
  task.createdAt = event.block.timestamp;
  task.publishedAt = null;
  task.adoptedSubmissionId = null;
  task.submissionGuard = null;
  task.reviewGuard = null;
  task.adoptionStrategy = null;

  // Initialize metrics
  task.submissionCount = BigInt.zero();
  task.activeSubmissionCount = BigInt.zero();
  task.reviewCount = BigInt.zero();

  // Block info
  task.blockNumber = event.block.number;
  task.blockTimestamp = event.block.timestamp;
  task.transactionHash = event.transaction.hash;

  task.save();

  // Update user statistics
  let user = getOrCreateUser(event.params.publisher);
  user.taskCount = user.taskCount.plus(BigInt.fromI32(1));
  updateUserActivity(user, event.block.timestamp);

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "CREATED";
  taskEvent.task = task.id;
  taskEvent.data = `{"title":"${event.params.title}","category":"${event.params.category}","reward":"${event.params.reward.toString()}"}`;
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.tasksCreated = dailyStats.tasksCreated.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.totalTasks = globalStats.totalTasks.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleTaskPublished(event: TaskPublishedEvent): void {
  let task = Task.load(event.params.taskId.toString());
  if (task == null) {
    return;
  }

  task.status = "PUBLISHED";
  task.publishedAt = event.params.publishedAt;
  task.save();

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "PUBLISHED";
  taskEvent.task = task.id;
  taskEvent.data = `{"publishedAt":"${event.params.publishedAt.toString()}"}`;
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.tasksPublished = dailyStats.tasksPublished.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.activeTasks = globalStats.activeTasks.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleTaskCompleted(event: TaskCompletedEvent): void {
  let task = Task.load(event.params.taskId.toString());
  if (task == null) {
    return;
  }

  task.status = "COMPLETED";
  task.adoptedSubmissionId = event.params.adoptedSubmissionId;
  task.save();

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "COMPLETED";
  taskEvent.task = task.id;
  taskEvent.data = `{"adoptedSubmissionId":"${event.params.adoptedSubmissionId.toString()}"}`;
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.tasksCompleted = dailyStats.tasksCompleted.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.activeTasks = globalStats.activeTasks.minus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleTaskExpired(event: TaskExpiredEventEvent): void {
  let task = Task.load(event.params.taskId.toString());
  if (task == null) {
    return;
  }

  task.status = "EXPIRED";
  task.save();

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "EXPIRED";
  taskEvent.task = task.id;
  taskEvent.data = "{}";
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.tasksExpired = dailyStats.tasksExpired.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  globalStats.activeTasks = globalStats.activeTasks.minus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleTaskCancelled(event: TaskCancelledEvent): void {
  let task = Task.load(event.params.taskId.toString());
  if (task == null) {
    return;
  }

  task.status = "CANCELLED";
  task.save();

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "CANCELLED";
  taskEvent.task = task.id;
  taskEvent.data = `{"reason":"${event.params.reason}"}`;
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();

  // Update statistics
  let dailyStats = getOrCreateDailyStatistic(event.block.timestamp);
  dailyStats.tasksCancelled = dailyStats.tasksCancelled.plus(BigInt.fromI32(1));
  dailyStats.save();

  let globalStats = getOrCreateGlobalStatistic();
  if (task.status == "PUBLISHED" || task.status == "ACTIVE") {
    globalStats.activeTasks = globalStats.activeTasks.minus(BigInt.fromI32(1));
  }
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

export function handleTaskGuardsUpdated(event: TaskGuardsUpdatedEvent): void {
  let task = Task.load(event.params.taskId.toString());
  if (task == null) {
    return;
  }

  task.submissionGuard = event.params.submissionGuard;
  task.reviewGuard = event.params.reviewGuard;
  task.adoptionStrategy = event.params.adoptionStrategy;
  task.save();

  // Create task event
  let taskEvent = new TaskEvent(createEntityId(event.transaction.hash, event.logIndex));
  taskEvent.type = "GUARDS_UPDATED";
  taskEvent.task = task.id;
  taskEvent.data = `{"submissionGuard":"${event.params.submissionGuard.toHexString()}","reviewGuard":"${event.params.reviewGuard.toHexString()}","adoptionStrategy":"${event.params.adoptionStrategy.toHexString()}"}`;
  taskEvent.timestamp = event.block.timestamp;
  taskEvent.blockNumber = event.block.number;
  taskEvent.transactionHash = event.transaction.hash;
  taskEvent.save();
}