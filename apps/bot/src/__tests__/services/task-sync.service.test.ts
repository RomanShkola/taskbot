import mongoose from 'mongoose';
import { bot } from 'src/bot';
import { Task } from 'src/database/models/task.model';
import { User } from 'src/database/models/user.model';
import { TaskSyncService } from 'src/shared/services/task-sync.service';

jest.mock('src/bot', () => ({
  bot: {
    telegram: {
      editMessageText: jest.fn(),
      sendMessage: jest.fn(),
    },
  },
}));
jest.mock('src/bot/task-card.renderer', () => ({
  formatTaskCard: jest.fn().mockReturnValue('task card'),
  buildTaskButtons: jest.fn().mockResolvedValue([[{ text: 'Done', callback_data: 'done' }]]),
}));
jest.mock('src/database/models/task.model', () => ({
  Task: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock('src/database/models/user.model', () => ({
  User: { findById: jest.fn() },
}));
jest.mock('src/shared/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockTaskId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();

describe('TaskSyncService', () => {
  let service: TaskSyncService;

  beforeEach(() => {
    service = new TaskSyncService();
    jest.clearAllMocks();
    (User.findById as jest.Mock).mockResolvedValue({ _id: mockUserId, username: 'alice' });
  });

  it('should repost a missing task card into the original forum topic', async () => {
    const task = {
      _id: mockTaskId,
      taskNumber: 21,
      title: 'Topic task',
      createdBy: mockUserId,
      assigneeId: null,
      taskCardChatId: -100123,
      taskCardMessageThreadId: 73,
    };
    const populate = jest.fn().mockResolvedValue(task);
    (Task.findById as jest.Mock).mockReturnValue({ populate });
    (bot.telegram.sendMessage as jest.Mock).mockResolvedValue({
      message_id: 999,
      message_thread_id: 73,
    });

    await service.syncTaskCard(task as any);

    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      -100123,
      'task card',
      expect.objectContaining({
        message_thread_id: 73,
      })
    );
    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
      mockTaskId,
      expect.objectContaining({
        $set: expect.objectContaining({
          taskCardMessageId: 999,
          taskCardMessageThreadId: 73,
        }),
      })
    );
  });

  it('should post app status notifications into the task card topic', async () => {
    const task = {
      _id: mockTaskId,
      taskNumber: 22,
      title: 'Topic task',
      taskCardChatId: -100123,
      taskCardMessageThreadId: 88,
    };

    await service.postStatusNotification(task as any, mockUserId.toString(), 'updated');

    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      -100123,
      expect.stringContaining('#22'),
      expect.objectContaining({
        message_thread_id: 88,
      })
    );
  });
});
