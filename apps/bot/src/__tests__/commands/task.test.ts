import { TaskCommand } from 'src/bot/commands/task';
import { userService } from 'src/database/services/user.service';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import { User } from 'src/database/models/user.model';
import mongoose from 'mongoose';

jest.mock('src/database/services/user.service');
jest.mock('src/database/services/group.service');
jest.mock('src/database/services/task.service');
jest.mock('src/database/models/user.model', () => ({
  User: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock('src/bot/task-card.renderer', () => ({
  formatTaskCard: jest.fn().mockReturnValue('📋 *#1* Test task'),
  buildTaskButtons: jest.fn().mockResolvedValue([[{ text: '✅ Done', callback_data: 'test' }]]),
}));
jest.mock('src/shared/services/notification.service', () => ({
  notificationService: { notifyAssignment: jest.fn().mockResolvedValue(undefined) },
}));
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
const mockTask = { _id: mockTaskId, taskNumber: 1, title: 'Test task', status: 'todo', assigneeId: null };

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    chat: { id: -100123, type: 'supergroup', title: 'Test Group' },
    message: {
      text: '/task',
      ...overrides.message,
    },
    reply: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithPhoto: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithVideo: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithAnimation: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithDocument: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithAudio: jest.fn().mockResolvedValue({ message_id: 999 }),
    replyWithVoice: jest.fn().mockResolvedValue({ message_id: 999 }),
    ...overrides,
  } as any;
}

describe('TaskCommand', () => {
  let command: TaskCommand;

  beforeEach(() => {
    command = new TaskCommand();
    jest.useRealTimers();
    jest.clearAllMocks();
    (userService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);
    (groupService.findOrCreateGroup as jest.Mock).mockResolvedValue(mockGroup);
    (taskService.createTask as jest.Mock).mockResolvedValue(mockTask);
    (taskService.updateTask as jest.Mock).mockResolvedValue(mockTask);
  });

  it('should register the task command', () => {
    const map = command.register();
    expect(map.has('task')).toBe(true);
  });

  it('should reject non-group chats', async () => {
    const ctx = createMockCtx({ chat: { id: 123, type: 'private' } });

    await command.onTask(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('⚠️ /task можно использовать только в групповых чатах.');
  });

  it('should show usage when no args and no reply', async () => {
    const ctx = createMockCtx({ message: { text: '/task' } });

    await command.onTask(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Как использовать'),
      expect.any(Object)
    );
  });

  it('should create task from direct text input', async () => {
    const ctx = createMockCtx({ message: { text: '/task Deploy the API server' } });

    await command.onTask(ctx);

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deploy the API server',
        groupId: mockGroupId,
        createdBy: mockUserId,
      })
    );
  });

  it('should create task from a media caption command', async () => {
    const ctx = createMockCtx({
      message: {
        caption: '/task Review the attached design',
        photo: [{ file_id: 'photo-1', file_unique_id: 'photo-u1', width: 100, height: 100 }],
      },
    });

    await command.onTask(ctx);

    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(
      'photo-1',
      expect.objectContaining({
        caption: expect.any(String),
        parse_mode: 'Markdown',
        reply_markup: expect.any(Object),
      })
    );
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Review the attached design',
        groupId: mockGroupId,
        createdBy: mockUserId,
        attachments: [
          expect.objectContaining({
            type: 'photo',
            fileId: 'photo-1',
            fileUniqueId: 'photo-u1',
          }),
        ],
      })
    );
  });

  it('should count a gif animation as one attachment when Telegram also sends document data', async () => {
    const ctx = createMockCtx({
      message: {
        caption: '/task Check this gif',
        animation: {
          file_id: 'gif-animation',
          file_unique_id: 'gif-u1',
          width: 320,
          height: 240,
          duration: 3,
        },
        document: {
          file_id: 'gif-document',
          file_unique_id: 'gif-u1',
          file_name: 'animation.gif',
          mime_type: 'video/mp4',
        },
      },
    });

    await command.onTask(ctx);

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            type: 'animation',
            fileId: 'gif-animation',
            fileUniqueId: 'gif-u1',
          }),
        ],
      })
    );
  });

  it('should collect media group attachments into one task', async () => {
    jest.useFakeTimers();

    const firstCtx = createMockCtx({
      message: {
        media_group_id: 'album-1',
        photo: [{ file_id: 'photo-1', file_unique_id: 'photo-u1', width: 100, height: 100 }],
      },
    });
    const taskCtx = createMockCtx({
      message: {
        media_group_id: 'album-1',
        caption: '/task Album task',
        photo: [{ file_id: 'photo-2', file_unique_id: 'photo-u2', width: 120, height: 120 }],
      },
    });

    command.collectMediaGroupMessage(firstCtx);
    const taskPromise = command.onTask(taskCtx);
    await jest.advanceTimersByTimeAsync(1300);
    await taskPromise;

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Album task',
        attachments: expect.arrayContaining([
          expect.objectContaining({ type: 'photo', fileId: 'photo-1', fileUniqueId: 'photo-u1' }),
          expect.objectContaining({ type: 'photo', fileId: 'photo-2', fileUniqueId: 'photo-u2' }),
        ]),
      })
    );
    const createArg = (taskService.createTask as jest.Mock).mock.calls[0][0];
    expect(createArg.attachments).toHaveLength(2);
  });

  it('should create task from reply-to-message', async () => {
    const ctx = createMockCtx({
      message: {
        text: '/task',
        reply_to_message: {
          text: 'We need to fix the login bug',
          message_id: 42,
          from: { id: 999 },
        },
      },
    });

    await command.onTask(ctx);

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('fix the login bug'),
        sourceMessage: expect.objectContaining({
          messageId: 42,
        }),
      })
    );
  });

  it('should create task from replied media caption', async () => {
    const ctx = createMockCtx({
      message: {
        text: '/task',
        reply_to_message: {
          caption: 'Please process this receipt',
          document: { file_id: 'doc-1', file_unique_id: 'doc-u1' },
          message_id: 42,
          from: { id: 999 },
        },
      },
    });

    await command.onTask(ctx);

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Please process this receipt',
        description: 'Please process this receipt',
        attachments: [
          expect.objectContaining({
            type: 'document',
            fileId: 'doc-1',
            fileUniqueId: 'doc-u1',
          }),
        ],
        sourceMessage: expect.objectContaining({
          messageId: 42,
          text: 'Please process this receipt',
        }),
      })
    );
  });

  it('should not generate source message links for basic groups', async () => {
    const ctx = createMockCtx({
      chat: { id: -5286014997, type: 'group', title: 'Basic Group' },
      message: {
        text: '/task',
        reply_to_message: {
          text: 'Source in a basic group',
          message_id: 128,
          from: { id: 999 },
        },
      },
    });

    await command.onTask(ctx);

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMessage: expect.objectContaining({
          link: '',
        }),
      })
    );
  });

  it('should assign user when @mention found at end', async () => {
    const mentionedUser = { _id: new mongoose.Types.ObjectId(), username: 'john' };
    (User.findOne as jest.Mock).mockResolvedValue(mentionedUser);
    (User.findById as jest.Mock).mockResolvedValue(mentionedUser);

    const ctx = createMockCtx({ message: { text: '/task Fix the bug @john' } });

    await command.onTask(ctx);

    expect(User.findOne).toHaveBeenCalledWith({ username: 'john' });
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fix the bug',
        assigneeId: mentionedUser._id,
      })
    );
  });

  it('should send task card with inline buttons', async () => {
    const ctx = createMockCtx({ message: { text: '/task Test task' } });

    await command.onTask(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      })
    );
  });

  it('should store card message ID for later sync', async () => {
    const ctx = createMockCtx({ message: { text: '/task Test task' } });

    await command.onTask(ctx);

    expect(taskService.updateTask).toHaveBeenCalledWith(
      mockTaskId,
      expect.objectContaining({
        taskCardMessageId: 999,
        taskCardChatId: -100123,
      })
    );
  });
});
