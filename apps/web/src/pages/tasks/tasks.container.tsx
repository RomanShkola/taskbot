import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { TaskFilters, ITask } from '@tbot/shared';
import { useTasksList, useCreateTask } from '@/api/tasks';
import { TasksContent } from './tasks.content';

export function TasksContainer() {
  const { groupId } = useParams({ from: '/$groupId/tasks/' });
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilters>({ page: 1, limit: 50 });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useTasksList(groupId, filters);
  const createTask = useCreateTask(groupId);

  const handleTaskClick = (task: ITask) => {
    navigate({ to: '/$groupId/tasks/$taskId', params: { groupId, taskId: task._id } });
  };

  const handleCreateTask = async (input: Parameters<typeof createTask.mutateAsync>[0]) => {
    await createTask.mutateAsync(input);
    setShowCreateModal(false);
  };

  return (
    <TasksContent
      tasks={data?.data || []}
      isLoading={isLoading}
      filters={filters}
      onFiltersChange={setFilters}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onTaskClick={handleTaskClick}
      showCreateModal={showCreateModal}
      onShowCreateModal={setShowCreateModal}
      onCreateTask={handleCreateTask}
      isCreating={createTask.isPending}
    />
  );
}
