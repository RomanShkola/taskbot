import { createFileRoute, Navigate } from '@tanstack/react-router';

import { getStartParam } from '@/lib/telegram';

export const Route = createFileRoute('/')(
  {
    component: IndexPage,
  }
);

function IndexPage() {
  const startParam = getStartParam();

  if (startParam) {
    // Handle deep link format: "groupId_taskId" or just "groupId"
    const parts = startParam.split('_');
    const groupId = parts[0];
    const taskId = parts.length > 1 ? parts[1] : undefined;

    if (taskId) {
      return <Navigate to="/$groupId/tasks/$taskId" params={{ groupId, taskId }} />;
    }
    return <Navigate to="/$groupId/tasks" params={{ groupId }} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">📋 TBot</h1>
        <p className="mt-2 text-[var(--tg-theme-hint-color)]">Open from a Telegram group to view tasks</p>
      </div>
    </div>
  );
}
