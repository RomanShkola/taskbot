import mongoose from 'mongoose';
import { ITask, Task } from 'src/database/models/task.model';
import { groupService } from 'src/database/services/group.service';
import logger from 'src/shared/logger/logger';

export interface CreateTaskData {
  groupId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority?: string;
  createdBy: mongoose.Types.ObjectId;
  assigneeId?: mongoose.Types.ObjectId;
  dueDate?: Date;
  sourceMessage?: {
    messageId: number;
    chatId: number;
    text: string;
    fromUserId: number;
    link: string;
  };
}

export interface TaskFilters {
  status?: string;
  assigneeId?: mongoose.Types.ObjectId;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TaskService {
  async createTask(data: CreateTaskData): Promise<ITask> {
    const taskNumber = await groupService.incrementTaskCounter(data.groupId);

    const task = await Task.create({
      ...data,
      taskNumber,
      status: 'todo',
      priority: data.priority || 'medium',
    });

    logger.info(`Task #${taskNumber} created in group ${data.groupId}`);
    return task;
  }

  async getTaskById(taskId: string | mongoose.Types.ObjectId): Promise<ITask | null> {
    try {
      return await Task.findById(taskId).populate('createdBy assigneeId');
    } catch (error) {
      logger.error(`Error getting task ${taskId}: ${error}`);
      return null;
    }
  }

  async getTasksByGroup(
    groupId: mongoose.Types.ObjectId,
    filters: TaskFilters = {},
  ): Promise<{ tasks: ITask[]; total: number }> {
    try {
      const query: Record<string, unknown> = { groupId };

      if (filters.status) query.status = filters.status;
      if (filters.assigneeId) query.assigneeId = filters.assigneeId;
      if (filters.priority) query.priority = filters.priority;
      if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        Task.find(query).populate('createdBy assigneeId').sort({ createdAt: -1 }).skip(skip).limit(limit),
        Task.countDocuments(query),
      ]);

      return { tasks, total };
    } catch (error) {
      logger.error(`Error getting tasks for group ${groupId}: ${error}`);
      return { tasks: [], total: 0 };
    }
  }

  async updateTaskStatus(taskId: string | mongoose.Types.ObjectId, status: string): Promise<ITask | null> {
    try {
      const updateData: Record<string, unknown> = { status };

      if (status === 'done') {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }

      return await Task.findByIdAndUpdate(taskId, { $set: updateData }, { new: true, runValidators: true }).populate(
        'createdBy assigneeId',
      );
    } catch (error) {
      logger.error(`Error updating task status ${taskId}: ${error}`);
      return null;
    }
  }

  async updateTask(taskId: string | mongoose.Types.ObjectId, updates: Record<string, unknown>): Promise<ITask | null> {
    try {
      return await Task.findByIdAndUpdate(taskId, { $set: updates }, { new: true, runValidators: true }).populate(
        'createdBy assigneeId',
      );
    } catch (error) {
      logger.error(`Error updating task ${taskId}: ${error}`);
      return null;
    }
  }

  async assignTask(
    taskId: string | mongoose.Types.ObjectId,
    assigneeId: mongoose.Types.ObjectId | null,
  ): Promise<ITask | null> {
    try {
      return await Task.findByIdAndUpdate(
        taskId,
        { $set: { assigneeId } },
        { new: true, runValidators: true },
      ).populate('createdBy assigneeId');
    } catch (error) {
      logger.error(`Error assigning task ${taskId}: ${error}`);
      return null;
    }
  }

  async deleteTask(taskId: string | mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await Task.findByIdAndDelete(taskId);
      return !!result;
    } catch (error) {
      logger.error(`Error deleting task ${taskId}: ${error}`);
      return false;
    }
  }

  async getTaskStats(groupId: mongoose.Types.ObjectId): Promise<Record<string, number>> {
    try {
      const stats = await Task.aggregate([{ $match: { groupId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);

      const result: Record<string, number> = { todo: 0, in_progress: 0, done: 0 };
      for (const stat of stats) {
        result[stat._id] = stat.count;
      }
      return result;
    } catch (error) {
      logger.error(`Error getting task stats for group ${groupId}: ${error}`);
      return { todo: 0, in_progress: 0, done: 0 };
    }
  }

  async getTaskByNumber(groupId: mongoose.Types.ObjectId, taskNumber: number): Promise<ITask | null> {
    try {
      return await Task.findOne({ groupId, taskNumber }).populate('createdBy assigneeId');
    } catch (error) {
      logger.error(`Error getting task #${taskNumber} in group ${groupId}: ${error}`);
      return null;
    }
  }

  async getTaskByCardMessage(taskCardChatId: number, taskCardMessageId: number): Promise<ITask | null> {
    try {
      return await Task.findOne({ taskCardChatId, taskCardMessageId }).populate('createdBy assigneeId');
    } catch (error) {
      logger.error(`Error getting task by card message ${taskCardMessageId}: ${error}`);
      return null;
    }
  }
}

export const taskService = new TaskService();
