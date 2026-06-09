import { TaskController } from 'src/api/controllers/task.controller';
import { taskService } from 'src/database/services/task.service';
import { taskSyncService } from 'src/shared/services/task-sync.service';
import mongoose from 'mongoose';

jest.mock('src/database/services/task.service');
jest.mock('src/shared/services/task-sync.service');
jest.mock('src/shared/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockObjectId = new mongoose.Types.ObjectId();
const mockGroupId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();

const mockTask = {
  _id: mockObjectId.toString(),
  groupId: mockGroupId.toString(),
  title: 'Test task',
  status: 'todo',
  priority: 'medium',
  taskNumber: 1,
  createdBy: mockUserId.toString(),
};

function createMockReqRes(overrides: Record<string, any> = {}) {
  const req: any = {
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('TaskController', () => {
  let controller: TaskController;

  beforeEach(() => {
    controller = new TaskController();
    jest.clearAllMocks();
    (taskSyncService.syncTaskCard as jest.Mock).mockResolvedValue(undefined);
    (taskSyncService.postStatusNotification as jest.Mock).mockResolvedValue(undefined);
  });

  describe('listTasks', () => {
    it('should return tasks with pagination metadata', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        query: {},
      });

      (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
        tasks: [mockTask],
        total: 1,
      });

      await controller.listTasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [mockTask],
        meta: expect.objectContaining({ total: 1 }),
      });
    });

    it('should return 400 for invalid query params', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        query: { status: 'invalid_status' },
      });

      await controller.listTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid query params' })
      );
    });
  });

  describe('createTask', () => {
    it('should create task and return 201', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        body: { title: 'New task' },
        user: { _id: mockUserId },
      });

      (taskService.createTask as jest.Mock).mockResolvedValue(mockTask);

      await controller.createTask(req, res);

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New task' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: mockTask });
    });

    it('should sync task card after creation', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        body: { title: 'Synced task' },
        user: { _id: mockUserId },
      });

      (taskService.createTask as jest.Mock).mockResolvedValue(mockTask);

      await controller.createTask(req, res);

      expect(taskSyncService.syncTaskCard).toHaveBeenCalledWith(mockTask);
    });

    it('should return 400 for missing title', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        body: {},
        user: { _id: mockUserId },
      });

      await controller.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation error' })
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
        body: { title: 'Task' },
        // no user
      });

      await controller.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getTask', () => {
    it('should return task when found', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
      });

      (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      await controller.getTask(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: mockTask });
    });

    it('should return 404 when task not found', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
      });

      (taskService.getTaskById as jest.Mock).mockResolvedValue(null);

      await controller.getTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTask', () => {
    it('should update task status and sync', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
        body: { status: 'done' },
        user: { _id: mockUserId },
      });

      const updatedTask = { ...mockTask, status: 'done' };
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue(updatedTask);

      await controller.updateTask(req, res);

      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        mockObjectId.toString(),
        'done'
      );
      expect(taskSyncService.syncTaskCard).toHaveBeenCalledWith(updatedTask);
      expect(res.json).toHaveBeenCalledWith({ data: updatedTask });
    });

    it('should update task fields without status change', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
        body: { title: 'Updated title', priority: 'high' },
      });

      const updatedTask = { ...mockTask, title: 'Updated title', priority: 'high' };
      (taskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      await controller.updateTask(req, res);

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockObjectId.toString(),
        expect.objectContaining({ title: 'Updated title', priority: 'high' })
      );
    });

    it('should return 404 when task not found', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
        body: { title: 'Updated' },
      });

      (taskService.updateTask as jest.Mock).mockResolvedValue(null);

      await controller.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid update body', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
        body: { status: 'invalid_status' },
      });

      await controller.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteTask', () => {
    it('should delete task and return success', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
      });

      (taskService.deleteTask as jest.Mock).mockResolvedValue(true);

      await controller.deleteTask(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: { deleted: true } });
    });

    it('should return 404 when task not found', async () => {
      const { req, res } = createMockReqRes({
        params: { taskId: mockObjectId.toString() },
      });

      (taskService.deleteTask as jest.Mock).mockResolvedValue(false);

      await controller.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getStats', () => {
    it('should return task stats', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
      });

      const stats = { todo: 5, in_progress: 3, done: 10 };
      (taskService.getTaskStats as jest.Mock).mockResolvedValue(stats);

      await controller.getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: stats });
    });
  });
});
