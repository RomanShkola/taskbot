import { createFileRoute } from '@tanstack/react-router';

import { TaskDetailPage } from '@/pages/task-detail/task-detail.page';

export const Route = createFileRoute('/$groupId/tasks/$taskId')({
  component: TaskDetailPage,
});
