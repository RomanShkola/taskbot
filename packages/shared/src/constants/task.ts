export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: '📝 Todo',
  [TaskStatus.IN_PROGRESS]: '🔄 In Progress',
  [TaskStatus.DONE]: '✅ Done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '⬇️ Low',
  [TaskPriority.MEDIUM]: '➡️ Medium',
  [TaskPriority.HIGH]: '⬆️ High',
  [TaskPriority.URGENT]: '🔴 Urgent',
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
];

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

export const DEFAULT_TASK_STATUS = TaskStatus.TODO;
export const DEFAULT_TASK_PRIORITY = TaskPriority.MEDIUM;
