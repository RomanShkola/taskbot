import type { TaskStatus, TaskPriority } from '@tbot/shared';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@tbot/shared';
import type { TaskFilters } from '@tbot/shared';

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
}

export function TaskFiltersBar({ filters, onFiltersChange, viewMode, onViewModeChange }: TaskFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 p-4 border-b border-[var(--tg-theme-secondary-bg-color)]">
      {/* View toggle + search */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-[var(--tg-theme-secondary-bg-color)]">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]' : 'text-[var(--tg-theme-hint-color)]'}`}
          >
            ☰ List
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]' : 'text-[var(--tg-theme-hint-color)]'}`}
          >
            ▦ Board
          </button>
        </div>

        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined, page: 1 })}
          className="flex-1 rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-1.5 text-sm text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none focus:border-[var(--tg-theme-link-color)]"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <select
          value={filters.status || ''}
          onChange={(e) => onFiltersChange({ ...filters, status: (e.target.value as TaskStatus) || undefined, page: 1 })}
          className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-2 py-1 text-xs text-[var(--tg-theme-text-color)]"
        >
          <option value="">All Status</option>
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.priority || ''}
          onChange={(e) => onFiltersChange({ ...filters, priority: (e.target.value as TaskPriority) || undefined, page: 1 })}
          className="rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-2 py-1 text-xs text-[var(--tg-theme-text-color)]"
        >
          <option value="">All Priority</option>
          {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {(filters.status || filters.priority || filters.search) && (
          <button
            onClick={() => onFiltersChange({ page: 1 })}
            className="text-xs text-[var(--tg-theme-link-color)] whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
