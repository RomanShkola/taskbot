import { TASK_STATUS_LABELS } from '@tbot/shared';
import { BotContext } from 'src/bot/interface/context';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import { userService } from 'src/database/services/user.service';
import logger from 'src/shared/logger/logger';

export class TasksCommand {
  private map: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set('tasks', this.onTasks.bind(this));
    return this.map;
  }

  async onTasks(ctx: BotContext) {
    try {
      const chatId = ctx.chat?.id;
      const chatType = ctx.chat?.type;

      if (!chatId || (chatType !== 'group' && chatType !== 'supergroup')) {
        await ctx.reply('⚠️ /tasks можно использовать только в групповых чатах.');
        return;
      }

      const user = await userService.findOrCreateUser(ctx);
      if (!user) return;

      const chatTitle = 'title' in ctx.chat! ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(chatId, chatTitle);
      if (!group) {
        await ctx.reply('❌ Не удалось найти эту группу.');
        return;
      }

      const message = ctx.message;
      if (!message) return;
      const messageText = 'text' in message ? message.text || '' : '';
      const args = messageText.replace(/^\/tasks(@\w+)?\s*/, '').trim().toLowerCase();

      // Parse filter argument
      const filters: Record<string, unknown> = {};

      if (args === 'mine') {
        filters.assigneeId = user._id;
      } else if (args === 'todo') {
        filters.status = 'todo';
      } else if (args === 'in_progress' || args === 'progress') {
        filters.status = 'in_progress';
      } else if (args === 'done') {
        filters.status = 'done';
      } else if (args.startsWith('@')) {
        const username = args.replace('@', '');
        const { User } = await import('src/database/models/user.model');
        const targetUser = await User.findOne({ username });
        if (targetUser) {
          filters.assigneeId = targetUser._id;
        }
      }

      const stats = await taskService.getTaskStats(group._id);
      const total = stats.todo + stats.in_progress + stats.done;

      if (total === 0) {
        await ctx.reply(
          '📋 В этой группе пока нет задач.\n\nИспользуйте /task, чтобы создать первую задачу!',
        );
        return;
      }

      // Build summary
      let summary = `📊 *Задачи в ${chatTitle}*\n━━━━━━━━━━━━━━━━━━━\n`;

      for (const [status, label] of Object.entries(TASK_STATUS_LABELS)) {
        const count = stats[status] || 0;
        summary += `${label}: *${count}*\n`;
      }
      summary += `\n📎 Всего: *${total}*`;

      // If filtered, show filtered tasks
      if (Object.keys(filters).length > 0) {
        const { tasks } = await taskService.getTasksByGroup(group._id, filters);
        if (tasks.length > 0) {
          summary += `\n\n📋 *Результаты фильтра (${tasks.length}):*\n`;
          for (const task of tasks.slice(0, 15)) {
            const statusEmoji = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '📝';
            summary += `${statusEmoji} *#${task.taskNumber}* ${task.title}\n`;
          }
          if (tasks.length > 15) {
            summary += `_...и еще ${tasks.length - 15}_\n`;
          }
        }
      }

      await ctx.reply(summary, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error(`Error in /tasks command: ${error}`);
      await ctx.reply('❌ Не удалось загрузить задачи. Попробуйте еще раз.');
    }
  }
}

export const tasksCommand = new TasksCommand();
