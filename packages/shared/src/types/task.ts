import type { TaskPriority, TaskStatus } from '../constants/task.js';

export interface ISourceMessage {
  messageId: number;
  chatId: number;
  text: string;
  fromUserId: number;
  link: string;
}

export interface ITask {
  _id: string;
  groupId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: string;
  assigneeId?: string;
  dueDate?: string;
  taskNumber: number;
  sourceMessage?: ISourceMessage;
  completedAt?: string;
  reminderSent?: boolean;
  taskCardMessageId?: number;
  taskCardChatId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  search?: string;
  page?: number;
  limit?: number;
}
