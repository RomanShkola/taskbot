import { BotContext } from 'src/bot/interface/context';
import { ITask } from 'src/database/models/task.model';
import { IUser } from 'src/database/models/user.model';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import { userService } from 'src/database/services/user.service';
import logger from 'src/shared/logger/logger';

export class DoneCommand {
  private map: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set('done', this.onDone.bind(this));
    return this.map;
  }

  async onDone(ctx: BotContext) {
    try {
      const chatId = ctx.chat?.id;
      const chatType = ctx.chat?.type;

      if (!chatId || (chatType !== 'group' && chatType !== 'supergroup')) {
        await ctx.reply('⚠️ /done можно использовать только в групповых чатах.');
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
      const args = messageText.replace(/^\/done(@\w+)?\s*/, '').trim();

      // Method 1: /done #123 — by task number
      const numberMatch = args.match(/^#?(\d+)$/);
      if (numberMatch) {
        const taskNumber = parseInt(numberMatch[1], 10);
        const task = await taskService.getTaskByNumber(group._id, taskNumber);

        if (!task) {
          await ctx.reply(`❌ Задача #${taskNumber} не найдена в этой группе.`);
          return;
        }

        await this.completeTask(ctx, task, user);
        return;
      }

      // Method 2: reply to a task card with /done
      const replyTo = 'reply_to_message' in message ? message.reply_to_message : null;
      if (!args && replyTo) {
        const task = await taskService.getTaskByCardMessage(chatId, replyTo.message_id);
        if (!task) {
          await ctx.reply('❌ Это сообщение не является карточкой задачи. Ответьте на карточку задачи или используйте `/done #123`.', {
            parse_mode: 'Markdown',
          });
          return;
        }

        await this.completeTask(ctx, task, user);
        return;
      }

      if (!args) {
        await ctx.reply(
          '📋 *Как использовать:*\n' +
            '• `/done #123` — отметить задачу #123 как готовую\n' +
            '• `/done 123` — то же самое\n' +
            '• Ответьте на карточку задачи командой `/done`',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await ctx.reply('❌ Неверный номер задачи. Используйте `/done #123` или `/done 123`.', {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error(`Error in /done command: ${error}`);
      await ctx.reply('❌ Не удалось завершить задачу. Попробуйте еще раз.');
    }
  }

  private async completeTask(ctx: BotContext, task: ITask, user: IUser) {
    if (task.status === 'done') {
      await ctx.reply(`ℹ️ Задача #${task.taskNumber} уже готова.`);
      return;
    }

    const updatedTask = await taskService.updateTaskStatus(task._id, 'done');
    if (!updatedTask) return;

    const displayName = userService.getDisplayName(user);
    await ctx.reply(`✅ ${displayName} завершил(а) *#${updatedTask.taskNumber}* — ${updatedTask.title}`, {
      parse_mode: 'Markdown',
    });
  }
}

export const doneCommand = new DoneCommand();
