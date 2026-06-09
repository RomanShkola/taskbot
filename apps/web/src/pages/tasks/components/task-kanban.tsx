import type { ITask } from '@tbot/shared';
import { TASK_STATUS_LABELS, TaskStatus } from '@tbot/shared';
import { TaskCard } from './task-card';

interface TaskKanbanProps {
  tasks: ITask[];
  onTaskClick: (task: ITask) => void;
}

const columns: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

const columnColors: Record<string, string> = {
  todo: 'border-blue-400',
  in_progress: 'border-yellow-400',
  done: 'border-green-400',
};

export function TaskKanban({ tasks, onTaskClick }: TaskKanbanProps) {
  const groupedTasks = columns.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, ITask[]>);

  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {columns.map((status) => (
        <div
          key={status}
          className={`flex min-w-[260px] flex-1 flex-col rounded-xl border-t-4 ${columnColors[status]} bg-[var(--tg-theme-secondary-bg-color)] bg-opacity-30`}
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-medium text-[var(--tg-theme-text-color)]">
              {TASK_STATUS_LABELS[status]}
            </span>
            <span className="rounded-full bg-[var(--tg-theme-secondary-bg-color)] px-2 py-0.5 text-xs text-[var(--tg-theme-hint-color)]">
              {groupedTasks[status].length}
            </span>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {groupedTasks[status].length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--tg-theme-hint-color)]">No tasks</p>
            ) : (
              groupedTasks[status].map((task) => (
                <TaskCard key={task._id} task={task} onClick={onTaskClick} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
