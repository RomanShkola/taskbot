import type { ITask } from '@tbot/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

interface TaskCardProps {
  task: ITask;
  onClick?: (task: ITask) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';

  return (
    <div
      onClick={() => onClick?.(task)}
      className="cursor-pointer rounded-xl border border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)] p-3.5 transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--tg-theme-hint-color)]">#{task.taskNumber}</span>
            <StatusBadge status={task.status} />
          </div>
          <h3 className="mt-1.5 text-sm font-medium text-[var(--tg-theme-text-color)] leading-snug line-clamp-2">
            {task.title}
          </h3>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-xs text-[var(--tg-theme-hint-color)]">
        {task.assigneeId && (
          <span className="flex items-center gap-1">
            👤 {typeof task.assigneeId === 'object' && 'username' in task.assigneeId
              ? `@${(task.assigneeId as any).username}`
              : 'Assigned'}
          </span>
        )}
        {dueDate && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
            📅 {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {isOverdue && ' (overdue)'}
          </span>
        )}
      </div>
    </div>
  );
}
