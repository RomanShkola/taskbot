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
        await ctx.reply('⚠️ /done can only be used in group chats.');
        return;
      }

      const user = await userService.findOrCreateUser(ctx);
      if (!user) return;

      const chatTitle = 'title' in ctx.chat! ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(chatId, chatTitle);
      if (!group) {
        await ctx.reply('❌ Could not find this group.');
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
          await ctx.reply(`❌ Task #${taskNumber} not found in this group.`);
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
          await ctx.reply("❌ That message isn't a task card. Reply to a task card or use `/done #123`.", {
            parse_mode: 'Markdown',
          });
          return;
        }

        await this.completeTask(ctx, task, user);
        return;
      }

      if (!args) {
        await ctx.reply(
          '📋 *Usage:*\n' +
            '• `/done #123` — mark task #123 as done\n' +
            '• `/done 123` — same as above\n' +
            '• Reply to a task card with `/done`',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await ctx.reply('❌ Invalid task number. Use `/done #123` or `/done 123`.', {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error(`Error in /done command: ${error}`);
      await ctx.reply('❌ Failed to complete task. Please try again.');
    }
  }

  private async completeTask(ctx: BotContext, task: ITask, user: IUser) {
    if (task.status === 'done') {
      await ctx.reply(`ℹ️ Task #${task.taskNumber} is already done.`);
      return;
    }

    const updatedTask = await taskService.updateTaskStatus(task._id, 'done');
    if (!updatedTask) return;

    const displayName = userService.getDisplayName(user);
    await ctx.reply(`✅ ${displayName} completed *#${updatedTask.taskNumber}* — ${updatedTask.title}`, {
      parse_mode: 'Markdown',
    });
  }
}

export const doneCommand = new DoneCommand();
