import { TASK_PRIORITY_LABELS, TaskPriority } from '@tbot/shared';

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600 font-bold',
};

export function PriorityBadge({ priority }: { priority: TaskPriority | string }) {
  const label = TASK_PRIORITY_LABELS[priority as TaskPriority] || priority;
  const color = priorityColors[priority] || 'text-gray-500';
  return <span className={`text-xs ${color}`}>{label}</span>;
}
