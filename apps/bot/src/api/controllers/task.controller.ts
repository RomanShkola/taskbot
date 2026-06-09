import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from 'src/api/middlewares/auth.middleware';
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from 'src/api/validation';
import { taskService } from 'src/database/services/task.service';
import { taskSyncService } from 'src/shared/services/task-sync.service';

export class TaskController {
  async listTasks(req: Request, res: Response) {
    const groupId = req.params.groupId as string;

    const queryResult = taskQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({ error: 'Invalid query params', details: queryResult.error.issues });
      return;
    }

    const filters = queryResult.data;
    const objectGroupId = new mongoose.Types.ObjectId(groupId);
    const { tasks, total } = await taskService.getTasksByGroup(objectGroupId, {
      ...filters,
      assigneeId: filters.assigneeId ? new mongoose.Types.ObjectId(filters.assigneeId) : undefined,
    });

    res.json({
      data: tasks,
      meta: { page: filters.page, limit: filters.limit, total },
    });
  }

  async createTask(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const groupId = req.params.groupId as string;

    const bodyResult = createTaskSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: 'Validation error', details: bodyResult.error.issues });
      return;
    }

    const userId = authReq.user?._id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const objectGroupId = new mongoose.Types.ObjectId(groupId);
    const task = await taskService.createTask({
      groupId: objectGroupId,
      createdBy: userId,
      title: bodyResult.data.title,
      description: bodyResult.data.description,
      priority: bodyResult.data.priority,
      assigneeId: bodyResult.data.assigneeId ? new mongoose.Types.ObjectId(bodyResult.data.assigneeId) : undefined,
      dueDate: bodyResult.data.dueDate ? new Date(bodyResult.data.dueDate) : undefined,
    });

    // Sync: post card to group chat
    taskSyncService.syncTaskCard(task).catch(() => {});

    res.status(201).json({ data: task });
  }

  async getTask(req: Request, res: Response) {
    const taskId = req.params.taskId as string;

    const task = await taskService.getTaskById(taskId);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    res.json({ data: task });
  }

  async updateTask(req: Request, res: Response) {
    const taskId = req.params.taskId as string;

    const bodyResult = updateTaskSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: 'Validation error', details: bodyResult.error.issues });
      return;
    }

    const updates: Record<string, unknown> = {};
    const data = bodyResult.data;

    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.assigneeId !== undefined) {
      updates.assigneeId = data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : null;
    }
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    let task;
    if (data.status !== undefined) {
      task = await taskService.updateTaskStatus(taskId, data.status);
      if (Object.keys(updates).length > 0) {
        task = await taskService.updateTask(taskId, updates);
      }
    } else {
      task = await taskService.updateTask(taskId, updates);
    }

    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    // Sync: update card in group chat
    const authReq = req as AuthenticatedRequest;
    const action = data.status ? `changed status to ${data.status}` : 'updated';
    taskSyncService.syncTaskCard(task).catch(() => {});
    if (authReq.user) {
      taskSyncService.postStatusNotification(task, authReq.user._id.toString(), action).catch(() => {});
    }

    res.json({ data: task });
  }

  async deleteTask(req: Request, res: Response) {
    const taskId = req.params.taskId as string;

    const deleted = await taskService.deleteTask(taskId);
    if (!deleted) { res.status(404).json({ error: 'Task not found' }); return; }

    res.json({ data: { deleted: true } });
  }

  async getStats(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const objectGroupId = new mongoose.Types.ObjectId(groupId);
    const stats = await taskService.getTaskStats(objectGroupId);

    res.json({ data: stats });
  }
}

export const taskController = new TaskController();
