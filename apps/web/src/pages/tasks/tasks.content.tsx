import type { ITask, TaskFilters, CreateTaskInput } from '@tbot/shared';
import { Layout } from '@/components/layout/layout';
import { TaskFiltersBar } from './components/task-filters';
import { TaskList } from './components/task-list';
import { TaskKanban } from './components/task-kanban';
import { CreateTaskModal } from './components/create-task-modal';

interface TasksContentProps {
  tasks: ITask[];
  isLoading: boolean;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  onTaskClick: (task: ITask) => void;
  showCreateModal: boolean;
  onShowCreateModal: (show: boolean) => void;
  onCreateTask: (input: CreateTaskInput) => void;
  isCreating?: boolean;
}

export function TasksContent({
  tasks,
  isLoading,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  onTaskClick,
  showCreateModal,
  onShowCreateModal,
  onCreateTask,
  isCreating,
}: TasksContentProps) {
  if (isLoading) {
    return (
      <Layout title="Задачи">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-[var(--tg-theme-hint-color)]">Загрузка задач...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Задачи"
      fab={
        <button
          onClick={() => onShowCreateModal(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] shadow-lg text-2xl active:scale-95 transition-transform"
        >
          +
        </button>
      }
    >
      <TaskFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-lg text-[var(--tg-theme-hint-color)]">Задач пока нет</p>
          <p className="mt-1 text-sm text-[var(--tg-theme-hint-color)]">
            Создайте задачу кнопкой + или командой /task в чате
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <TaskList tasks={tasks} onTaskClick={onTaskClick} />
      ) : (
        <TaskKanban tasks={tasks} onTaskClick={onTaskClick} />
      )}

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => onShowCreateModal(false)}
        onSubmit={onCreateTask}
        isLoading={isCreating}
      />
    </Layout>
  );
}
