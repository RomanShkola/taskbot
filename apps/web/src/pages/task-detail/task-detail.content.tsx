import type { ITask, IUser } from '@tbot/shared';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TaskStatus, TaskPriority } from '@tbot/shared';
import { useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { AssigneePicker } from './components/assignee-picker';

interface TaskDetailContentProps {
  task: ITask | null;
  isLoading: boolean;
  members: IUser[];
  onBack: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
  isUpdating?: boolean;
}

export function TaskDetailContent({
  task,
  isLoading,
  members,
  onBack,
  onUpdate,
  onDelete,
  isUpdating,
}: TaskDetailContentProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading || !task) {
    return (
      <Layout title="Task" onBack={onBack}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-[var(--tg-theme-hint-color)]">
            {isLoading ? 'Loading...' : 'Task not found'}
          </div>
        </div>
      </Layout>
    );
  }

  const createdDate = new Date(task.createdAt);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  return (
    <Layout title={`#${task.taskNumber}`} onBack={onBack}>
      <div className="flex flex-col gap-4 p-4">
        {/* Title */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--tg-theme-text-color)] leading-tight">
            {task.title}
          </h2>
          {task.description && (
            <p className="mt-2 text-sm text-[var(--tg-theme-hint-color)] whitespace-pre-wrap">
              {task.description}
            </p>
          )}
        </div>

        {/* Status buttons */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Status</label>
          <div className="flex gap-2">
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onUpdate({ status: value })}
                disabled={task.status === value || isUpdating}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  task.status === value
                    ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                    : 'border border-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] active:bg-[var(--tg-theme-secondary-bg-color)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Priority</label>
          <select
            value={task.priority}
            onChange={(e) => onUpdate({ priority: e.target.value })}
            disabled={isUpdating}
            className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2.5 text-sm text-[var(--tg-theme-text-color)]"
          >
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Assignee</label>
          <AssigneePicker
            members={members}
            currentAssigneeId={task.assigneeId as string | undefined}
            onSelect={(userId) => onUpdate({ assigneeId: userId })}
          />
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Due Date</label>
          <input
            type="date"
            value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
            onChange={(e) => onUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2.5 text-sm text-[var(--tg-theme-text-color)]"
          />
        </div>

        {/* Meta info */}
        <div className="border-t border-[var(--tg-theme-secondary-bg-color)] pt-3 space-y-1.5">
          <p className="text-xs text-[var(--tg-theme-hint-color)]">
            Created: {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {task.completedAt && (
            <p className="text-xs text-[var(--tg-theme-hint-color)]">
              Completed: {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {task.sourceMessage?.link && (
            <a
              href={task.sourceMessage.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[var(--tg-theme-link-color)]"
            >
              💬 View source message
            </a>
          )}
        </div>

        {/* Delete */}
        <div className="border-t border-[var(--tg-theme-secondary-bg-color)] pt-4">
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-[var(--tg-theme-secondary-bg-color)] py-2.5 text-sm text-[var(--tg-theme-text-color)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-500"
            >
              🗑 Delete Task
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
