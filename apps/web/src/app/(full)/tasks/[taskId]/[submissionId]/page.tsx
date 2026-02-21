import { notFound } from "next/navigation";

import { SubmissionDetailView } from "@/components/tasks/submission-detail-view";
import { loadTaskDetail } from "@/services/subgraph";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ taskId: string; submissionId: string }>;
}) {
  const { taskId, submissionId } = await params;
  const task = await loadTaskDetail(taskId);
  const submission = task?.submissions.find((item) => item.id === submissionId);

  if (!task || !submission) {
    notFound();
  }

  return <SubmissionDetailView task={task} submission={submission} />;
}
