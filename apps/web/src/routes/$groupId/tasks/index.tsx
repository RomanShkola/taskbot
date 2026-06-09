import { createFileRoute } from '@tanstack/react-router';

import { TasksPage } from '@/pages/tasks/tasks.page';

export const Route = createFileRoute('/$groupId/tasks/')({
  component: TasksPage,
});
