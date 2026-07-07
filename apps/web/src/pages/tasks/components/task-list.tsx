import type { ITask } from '@tbot/shared';
import { TaskCard } from './task-card';

interface TaskListProps {
  tasks: ITask[];
  onTaskClick: (task: ITask) => void;
}

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-[var(--tg-theme-hint-color)]">Задачи не найдены</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} onClick={onTaskClick} />
      ))}
    </div>
  );
}
