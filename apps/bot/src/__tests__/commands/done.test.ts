import { DoneCommand } from 'src/bot/commands/done';
import { userService } from 'src/database/services/user.service';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import mongoose from 'mongoose';

jest.mock('src/database/services/user.service');
jest.mock('src/database/services/group.service');
jest.mock('src/database/services/task.service');
jest.mock('src/shared/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockGroupId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();
const mockTaskId = new mongoose.Types.ObjectId();

const mockUser = { _id: mockUserId, telegramUserId: 123, username: 'testuser', firstName: 'Test' };
const mockGroup = { _id: mockGroupId, telegramGroupId: -100123, groupName: 'Test Group' };

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    chat: { id: -100123, type: 'supergroup', title: 'Test Group' },
    message: {
      text: '/done',
      ...overrides.message,
    },
    reply: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as any;
}

describe('DoneCommand', () => {
  let command: DoneCommand;

  beforeEach(() => {
    command = new DoneCommand();
    jest.clearAllMocks();
    (userService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);
    (groupService.findOrCreateGroup as jest.Mock).mockResolvedValue(mockGroup);
  });

  it('should register the done command', () => {
    const map = command.register();
    expect(map.has('done')).toBe(true);
  });

  it('should reject non-group chats', async () => {
    const ctx = createMockCtx({ chat: { id: 123, type: 'private' } });

    await command.onDone(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('⚠️ /done можно использовать только в групповых чатах.');
  });

  it('should mark task as done by number with #', async () => {
    const ctx = createMockCtx({ message: { text: '/done #5' } });

    const mockTask = { _id: mockTaskId, taskNumber: 5, title: 'Fix bug', status: 'todo' };
    (taskService.getTaskByNumber as jest.Mock).mockResolvedValue(mockTask);
    (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({ ...mockTask, status: 'done' });
    (userService.getDisplayName as jest.Mock).mockReturnValue('Test');

    await command.onDone(ctx);

    expect(taskService.getTaskByNumber).toHaveBeenCalledWith(mockGroupId, 5);
    expect(taskService.updateTaskStatus).toHaveBeenCalledWith(mockTaskId, 'done');
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('#5'),
      expect.objectContaining({ parse_mode: 'Markdown' })
    );
  });

  it('should mark task as done by number without #', async () => {
    const ctx = createMockCtx({ message: { text: '/done 3' } });

    const mockTask = { _id: mockTaskId, taskNumber: 3, title: 'Deploy', status: 'in_progress' };
    (taskService.getTaskByNumber as jest.Mock).mockResolvedValue(mockTask);
    (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({ ...mockTask, status: 'done' });
    (userService.getDisplayName as jest.Mock).mockReturnValue('Test');

    await command.onDone(ctx);

    expect(taskService.getTaskByNumber).toHaveBeenCalledWith(mockGroupId, 3);
    expect(taskService.updateTaskStatus).toHaveBeenCalled();
  });

  it('should show error when task not found', async () => {
    const ctx = createMockCtx({ message: { text: '/done #99' } });

    (taskService.getTaskByNumber as jest.Mock).mockResolvedValue(null);

    await command.onDone(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Задача #99 не найдена в этой группе.');
  });

  it('should show message when task already done', async () => {
    const ctx = createMockCtx({ message: { text: '/done #1' } });

    (taskService.getTaskByNumber as jest.Mock).mockResolvedValue({
      _id: mockTaskId, taskNumber: 1, title: 'Done task', status: 'done',
    });

    await command.onDone(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('ℹ️ Задача #1 уже готова.');
    expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('should show usage when no args provided', async () => {
    const ctx = createMockCtx({ message: { text: '/done' } });

    await command.onDone(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Как использовать'),
      expect.objectContaining({ parse_mode: 'Markdown' })
    );
  });

  it('should show error for invalid task number format', async () => {
    const ctx = createMockCtx({ message: { text: '/done abc' } });

    await command.onDone(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Неверный номер задачи'),
      expect.any(Object)
    );
  });
});
