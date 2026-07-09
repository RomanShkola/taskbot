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
const mockAssigneeId = new mongoose.Types.ObjectId();

const mockUser = { _id: mockUserId, telegramUserId: 123, username: 'testuser', firstName: 'Test' };
const mockAssignee = {
  _id: mockAssigneeId,
  telegramUserId: 456,
  username: 'alice',
  firstName: 'Alice',
  lastName: 'Smith',
};
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
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({ tasks: [], total: 0 });
  });

  it('should register the tasks command', () => {
    const map = command.register();
    expect(map.has('tasks')).toBe(true);
  });

  it('should reject non-group chats', async () => {
    const ctx = createMockCtx({ chat: { id: 123, type: 'private' } });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('⚠️ /tasks можно использовать только в групповых чатах.');
  });

  it('should show no-tasks message when empty', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 0, in_progress: 0, done: 0 });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('пока нет задач')
    );
  });

  it('should show task summary with counts', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 5, in_progress: 3, done: 10 });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('18'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
  });

  it('should show task assignee and current status in the default task list', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 1, in_progress: 1, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [
        {
          taskNumber: 1,
          title: 'Task 1',
          status: 'todo',
          assigneeId: mockAssignee,
          taskCardChatId: -100123,
          taskCardMessageId: 321,
        },
        { taskNumber: 2, title: 'Task 2', status: 'in_progress', assigneeId: null },
      ],
      total: 2,
    });

    await command.onTasks(ctx);

    expect(taskService.getTasksByGroup).toHaveBeenCalledWith(mockGroupId, {});
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('📝 Нужно сделать · 👤 @alice'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('[\\#1](https://t.me/c/123/321)'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('🔄 В работе · 👤 не назначена'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
  });

  it('should link to a task card even when /tasks is called from another topic', async () => {
    const ctx = createMockCtx({
      message: {
        text: '/tasks',
        is_topic_message: true,
        message_thread_id: 20,
      },
    });

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 1, in_progress: 0, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [
        {
          taskNumber: 21,
          title: 'Topic task',
          status: 'todo',
          assigneeId: null,
          taskCardChatId: -100123,
          taskCardMessageId: 654,
          taskCardMessageThreadId: 10,
        },
      ],
      total: 1,
    });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('[\\#21](https://t.me/c/123/654)'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
  });

  it('should render plain task numbers for basic groups without broken links', async () => {
    const ctx = createMockCtx({
      chat: { id: -5286014997, type: 'group', title: 'Basic Group' },
    });

    (groupService.findOrCreateGroup as jest.Mock).mockResolvedValue({
      ...mockGroup,
      telegramGroupId: -5286014997,
    });
    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 1, in_progress: 0, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [
        {
          taskNumber: 22,
          title: 'Basic group task',
          status: 'todo',
          assigneeId: null,
          taskCardChatId: -5286014997,
          taskCardMessageId: 111,
        },
      ],
      total: 1,
    });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.not.stringContaining('https://t.me/c/'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('*\\#22*'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
    );
  });

  it('should render plain task numbers for older tasks without stored card messages', async () => {
    const ctx = createMockCtx();

    (taskService.getTaskStats as jest.Mock).mockResolvedValue({ todo: 1, in_progress: 0, done: 0 });
    (taskService.getTasksByGroup as jest.Mock).mockResolvedValue({
      tasks: [{ taskNumber: 23, title: 'Old task', status: 'todo', assigneeId: null }],
      total: 1,
    });

    await command.onTasks(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('*\\#23*'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
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
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('📝 Нужно сделать · 👤 не назначена'),
      expect.objectContaining({ parse_mode: 'MarkdownV2' })
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
