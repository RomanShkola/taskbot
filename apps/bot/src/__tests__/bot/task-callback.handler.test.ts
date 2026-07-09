import mongoose from 'mongoose';
import { handleTaskCallback } from 'src/bot/task-callback.handler';
import { callbackDataStorageService } from 'src/shared/services/callback-data-storage.service';
import { taskService } from 'src/database/services/task.service';
import { userService } from 'src/database/services/user.service';
import { User } from 'src/database/models/user.model';

jest.mock('src/shared/services/callback-data-storage.service', () => ({
  callbackDataStorageService: {
    getCallbackDataOrNull: jest.fn(),
  },
}));
jest.mock('src/database/services/task.service', () => ({
  taskService: {
    getTaskByCardMessage: jest.fn(),
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
  },
}));
jest.mock('src/database/services/user.service', () => ({
  userService: {
    findUserByTelegramId: jest.fn(),
    getDisplayName: jest.fn((user) => user.username || user.firstName || 'User'),
  },
}));
jest.mock('src/database/models/user.model', () => ({
  User: {
    findById: jest.fn(),
  },
}));
jest.mock('src/bot/task-card.renderer', () => ({
  formatTaskCard: jest.fn().mockReturnValue('updated task card'),
  buildTaskButtons: jest.fn().mockResolvedValue([[{ text: 'Priority', callback_data: 'task:priority:new' }]]),
  storeTaskCallbackData: jest.fn(),
}));
jest.mock('src/shared/services/notification.service', () => ({
  notificationService: {
    notifyStatusChange: jest.fn(),
    notifyAssignment: jest.fn(),
  },
}));
jest.mock('src/database/services/group-member.service', () => ({
  groupMemberService: {
    getMembers: jest.fn(),
  },
}));
jest.mock('src/shared/logger/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const taskId = new mongoose.Types.ObjectId();
const groupId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

function buildContext(message: Record<string, unknown>) {
  return {
    callbackQuery: {
      data: 'task:priority:expired',
      from: { id: 123 },
      message,
    },
    editMessageText: jest.fn(),
    editMessageCaption: jest.fn(),
    answerCbQuery: jest.fn(),
  } as any;
}

describe('handleTaskCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (User.findById as jest.Mock).mockResolvedValue(null);
    (userService.findUserByTelegramId as jest.Mock).mockResolvedValue({
      _id: userId,
      telegramUserId: 123,
      username: 'alice',
    });
  });

  it('recovers expired task callbacks from the clicked task card message', async () => {
    const task = {
      _id: taskId,
      groupId,
      priority: 'medium',
      createdBy: userId,
      assigneeId: null,
    };
    const updatedTask = { ...task, priority: 'high' };
    const ctx = buildContext({ message_id: 55, chat: { id: -100123 }, text: 'task card' });

    (callbackDataStorageService.getCallbackDataOrNull as jest.Mock).mockResolvedValue(null);
    (taskService.getTaskByCardMessage as jest.Mock).mockResolvedValue(task);
    (taskService.getTaskById as jest.Mock).mockResolvedValue(task);
    (taskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

    await handleTaskCallback(ctx);

    expect(taskService.getTaskByCardMessage).toHaveBeenCalledWith(-100123, 55);
    expect(taskService.updateTask).toHaveBeenCalledWith(taskId, { priority: 'high' });
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      'updated task card',
      expect.objectContaining({
        parse_mode: 'Markdown',
      }),
    );
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Приоритет: 🟠 Высокий');
  });

  it('edits media task cards via caption when handling a callback', async () => {
    const task = {
      _id: taskId,
      groupId,
      priority: 'medium',
      createdBy: userId,
      assigneeId: null,
      attachments: [{ type: 'photo', fileId: 'file-id' }],
    };
    const updatedTask = { ...task, priority: 'high' };
    const ctx = buildContext({ message_id: 56, chat: { id: -100123 }, caption: 'task card' });

    (callbackDataStorageService.getCallbackDataOrNull as jest.Mock).mockResolvedValue({
      taskId: taskId.toString(),
      action: 'priority',
    });
    (taskService.getTaskById as jest.Mock).mockResolvedValue(task);
    (taskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

    await handleTaskCallback(ctx);

    expect(ctx.editMessageCaption).toHaveBeenCalledWith(
      'updated task card',
      expect.objectContaining({
        parse_mode: 'Markdown',
      }),
    );
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });
});
