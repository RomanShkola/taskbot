import { useState } from 'react';
import type { CreateTaskInput, TaskPriority } from '@tbot/shared';
import { TASK_PRIORITY_LABELS } from '@tbot/shared';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void;
  isLoading?: boolean;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit, isLoading }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority | string>('medium');
  const [dueDate, setDueDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority as TaskPriority,
      dueDate: dueDate || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[var(--tg-theme-bg-color)] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--tg-theme-text-color)]">Create Task</h2>
          <button onClick={onClose} className="text-[var(--tg-theme-hint-color)] text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Task title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2.5 text-sm text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none focus:border-[var(--tg-theme-link-color)]"
            autoFocus
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2.5 text-sm text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none resize-none focus:border-[var(--tg-theme-link-color)]"
          />

          <div className="flex gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2 text-sm text-[var(--tg-theme-text-color)]"
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2 text-sm text-[var(--tg-theme-text-color)]"
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || isLoading}
            className="mt-1 rounded-lg bg-[var(--tg-theme-button-color)] py-2.5 text-sm font-medium text-[var(--tg-theme-button-text-color)] transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
