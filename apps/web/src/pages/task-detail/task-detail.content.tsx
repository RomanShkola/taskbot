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
      <Layout title="Задача" onBack={onBack}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-[var(--tg-theme-hint-color)]">
            {isLoading ? 'Загрузка...' : 'Задача не найдена'}
          </div>
        </div>
      </Layout>
    );
  }

  const createdDate = new Date(task.createdAt);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const attachments = task.attachments || [];

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

        {attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Вложения</label>
            <div className="flex flex-col gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={`${attachment.fileUniqueId || attachment.fileId}-${index}`}
                  className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium capitalize text-[var(--tg-theme-text-color)]">
                      {formatAttachmentType(attachment.type)}
                    </span>
                    {attachment.fileSize && (
                      <span className="text-xs text-[var(--tg-theme-hint-color)]">
                        {formatFileSize(attachment.fileSize)}
                      </span>
                    )}
                  </div>
                  {(attachment.fileName || attachment.mimeType) && (
                    <p className="mt-1 truncate text-xs text-[var(--tg-theme-hint-color)]">
                      {attachment.fileName || attachment.mimeType}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status buttons */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Статус</label>
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
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Приоритет</label>
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
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Исполнитель</label>
          <AssigneePicker
            members={members}
            currentAssigneeId={task.assigneeId as string | undefined}
            onSelect={(userId) => onUpdate({ assigneeId: userId })}
          />
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--tg-theme-hint-color)] uppercase tracking-wide">Срок</label>
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
            Создана: {createdDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {task.completedAt && (
            <p className="text-xs text-[var(--tg-theme-hint-color)]">
              Завершена: {new Date(task.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          {task.sourceMessage?.link && (
            <a
              href={task.sourceMessage.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[var(--tg-theme-link-color)]"
            >
              💬 Исходное сообщение
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
                Удалить
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-[var(--tg-theme-secondary-bg-color)] py-2.5 text-sm text-[var(--tg-theme-text-color)]"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-500"
            >
              🗑 Удалить задачу
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentType(type: string) {
  const labels: Record<string, string> = {
    photo: 'Фото',
    video: 'Видео',
    animation: 'GIF',
    document: 'Файл',
    audio: 'Аудио',
    voice: 'Голосовое',
    video_note: 'Видео-кружок',
    sticker: 'Стикер',
  };
  return labels[type] || type;
}
