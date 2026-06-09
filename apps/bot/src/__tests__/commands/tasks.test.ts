import { TasksCommand } from 'src/bot/commands/tasks';
import { userService } from 'src/database/services/user.service';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import mongoose from 'mongoose';

jest.mock('src/database/services/user.service');
jest.mock('src/database/services/group.service');
jest.mock('src/database/services/task.service');
jest.mock('src/database/models/user.model', () => ({
  User: { findOne: jest.fn() },
}));
jest.mock('src/shared/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockGroupId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();

const mockUser = { _id: mockUserId, telegramUserId: 123, username: 'testuser', firstName: 'Test' };
const mockGroup = { _id: mockGroupId, telegramGroupId: -100123, groupName: 'Test Group' };

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    chat: { id: -100123, type: 'supergroup', title: 'Test Group' },
    message: { text: '/tasks', ...overrides.message },
    reply: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as any;
}

describe('TasksCommand', () => {
  let command: TasksCommand;

  beforeEach(() => {
    command = new TasksCommand();
    jest.clearAllMocks();
    (userService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);
    (groupService.findOrCreateGroup as jest.Mock).mockResolvedValue(mockGroup);
  });

  it('should register the tasks command', () => {
    const map = command.register();
    expect(map.has('tasks')).toBe(true);
  });

  it('should reject non-group chats', async () => {
    const ctx = createMockCtx({ chat: { id: 123, type: 'private' } });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('⚠️ /tasks can only be used in group chats.');
  });

  it('should show no-tasks message when empty', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 0, in_progress: 0, done: 0 });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('No tasks yet')
    );
  });

  it('should show task summary with counts', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 5, in_progress: 3, done: 10 });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('18'),
      expect.objectContaining({ parse_mode: 'Markdown' })
    );
  });

  it('should filter by status when /tasks todo', async () => {
    const ctx = createMockCtx({ message: { text: '/tasks todo' } });

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 2, in_progress: 0, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [{ taskNumber: 1, title: 'Task 1', status: 'todo' }],
      total: 1,
    });

    await command.onTasks(ctx);

    expect(taskService.getTasksByGroup).toHaveBeenCalledWith(
      mockGroupId,
      expect.objectContaining({ status: 'todo' })
    );
  });

  it('should filter by "mine" showing user tasks', async () => {
    const ctx = createMockCtx({ message: { text: '/tasks mine' } });

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 1, in_progress: 0, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({ tasks: [], total: 0 });

    await command.onTasks(ctx);

    expect(taskService.getTasksByGroup).toHaveBeenCalledWith(
      mockGroupId,
      expect.objectContaining({ assigneeId: mockUserId })
    );
  });

  it('should filter by "done" status', async () => {
    const ctx = createMockCtx({ message: { text: '/tasks done' } });

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 0, in_progress: 0, done: 3 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [{ taskNumber: 1, title: 'Done task', status: 'done' }],
      total: 1,
    });

    await command.onTasks(ctx);

    expect(taskService.getTasksByGroup).toHaveBeenCalledWith(
      mockGroupId,
      expect.objectContaining({ status: 'done' })
    );
  });
});
