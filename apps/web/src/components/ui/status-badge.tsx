import { TASK_STATUS_LABELS, TaskStatus } from '@tbot/shared';

const statusColors: Record<string, string> = {
  todo: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
};

export function StatusBadge({ status }: { status: TaskStatus | string }) {
  const label = TASK_STATUS_LABELS[status as TaskStatus] || status;
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
