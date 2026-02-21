import { TaskDetailView } from "@/components/tasks/task-detail-view";
import { loadTaskDetail } from "@/services/subgraph";
import { TaskDetailPending } from "@/components/tasks/task-detail-pending";

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = await loadTaskDetail(taskId);

  if (!task) {
    return <TaskDetailPending taskId={taskId} />;
  }

  return <TaskDetailView task={task} />;
}
