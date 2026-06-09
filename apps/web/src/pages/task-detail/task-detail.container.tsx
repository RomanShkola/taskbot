import { useNavigate, useParams } from '@tanstack/react-router';
import { useTask, useUpdateTask, useDeleteTask } from '@/api/tasks';
import { useGroupMembers } from '@/api/groups';
import { TaskDetailContent } from './task-detail.content';

export function TaskDetailContainer() {
  const { groupId, taskId } = useParams({ from: '/$groupId/tasks/$taskId' });
  const navigate = useNavigate();

  const { data: task, isLoading } = useTask(taskId);
  const { data: members = [] } = useGroupMembers(groupId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleBack = () => {
    navigate({ to: '/$groupId/tasks', params: { groupId } });
  };

  const handleUpdate = async (updates: Record<string, unknown>) => {
    await updateTask.mutateAsync({ taskId, ...updates } as any);
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(taskId);
    handleBack();
  };

  return (
    <TaskDetailContent
      task={task ?? null}
      isLoading={isLoading}
      members={members}
      onBack={handleBack}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      isUpdating={updateTask.isPending}
    />
  );
}
