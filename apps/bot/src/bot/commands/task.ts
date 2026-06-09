import { BotContext } from 'src/bot/interface/context';
import { buildTaskButtons, formatTaskCard } from 'src/bot/task-card.renderer';
import { User } from 'src/database/models/user.model';
import { groupService } from 'src/database/services/group.service';
import { taskService } from 'src/database/services/task.service';
import { userService } from 'src/database/services/user.service';
import { notificationService } from 'src/shared/services/notification.service';
import logger from 'src/shared/logger/logger';

export class TaskCommand {
  private map: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set('task', this.onTask.bind(this));
    return this.map;
  }

  async onTask(ctx: BotContext) {
    try {
      const chatId = ctx.chat?.id;
      const chatType = ctx.chat?.type;

      if (!chatId || (chatType !== 'group' && chatType !== 'supergroup')) {
        await ctx.reply('⚠️ /task can only be used in group chats.');
        return;
      }

      const user = await userService.findOrCreateUser(ctx);
      if (!user) {
        await ctx.reply('❌ Could not identify you. Please /start again.');
        return;
      }

      const chatTitle = 'title' in ctx.chat! ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(chatId, chatTitle);
      if (!group) {
        await ctx.reply('❌ Could not set up this group. Please try again.');
        return;
      }

      const message = ctx.message;
      if (!message) return;

      // Check if this is a reply to a message
      const replyTo = 'reply_to_message' in message ? message.reply_to_message : null;
      const messageText = 'text' in message ? message.text || '' : '';
      const args = messageText.replace(/^\/task(@\w+)?\s*/, '').trim();

      let title: string;
      let description: string | undefined;
      let assigneeId: typeof user._id | undefined;
      let sourceMessage: { messageId: number; chatId: number; text: string; fromUserId: number; link: string } | undefined;

      if (replyTo) {
        // Reply flow: create task from replied message
        const replyText = 'text' in replyTo ? replyTo.text || '' : '';
        const lines = replyText.split('\n');
        title = (args || lines[0]).substring(0, 200);
        description = replyText;

        if (!title) {
          title = lines[0].substring(0, 200) || 'Task from message';
        }

        // Build source message link
        const isPublic = chatType === 'supergroup' || chatType === 'group';
        const chatIdStr = String(chatId).replace('-100', '');
        const link = isPublic ? `https://t.me/c/${chatIdStr}/${replyTo.message_id}` : '';

        sourceMessage = {
          messageId: replyTo.message_id,
          chatId,
          text: replyText.substring(0, 2000),
          fromUserId: replyTo.from?.id || 0,
          link,
        };
      } else if (args) {
        // Direct flow: /task Deploy the new API server
        title = args;
      } else {
        await ctx.reply(
          '📋 *Usage:*\n' +
            '• Reply to a message with /task to create a task from it\n' +
            '• `/task Deploy the API server` to create directly\n' +
            '• `/task Deploy the API server @user` to create and assign',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check for @mention at the end to assign
      const mentionMatch = title.match(/@(\w+)\s*$/);
      if (mentionMatch) {
        title = title.replace(/@\w+\s*$/, '').trim();
        const mentionedUsername = mentionMatch[1];
        const mentionedUser = await User.findOne({ username: mentionedUsername });
        if (mentionedUser) {
          assigneeId = mentionedUser._id;
        }
      }

      // Also check entity-based mentions in the message
      if (!assigneeId && 'entities' in message && message.entities) {
        for (const entity of message.entities) {
          if (entity.type === 'text_mention' && entity.user) {
            const mentionedUser = await userService.findUserByTelegramId(entity.user.id);
            if (mentionedUser) {
              assigneeId = mentionedUser._id;
              const mentionText = messageText.substring(entity.offset, entity.offset + entity.length);
              title = title.replace(mentionText, '').trim();
            }
            break;
          }
        }
      }

      const task = await taskService.createTask({
        groupId: group._id,
        title,
        description,
        createdBy: user._id,
        assigneeId,
        sourceMessage,
      });

      // Send rich task card with inline buttons
      const assigneeUser = assigneeId ? await User.findById(assigneeId) : null;
      const cardText = formatTaskCard(task, user, assigneeUser);
      const buttons = await buildTaskButtons(task);

      const cardMessage = await ctx.reply(cardText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });

      // Store task card message ID for later updates
      await taskService.updateTask(task._id, {
        taskCardMessageId: cardMessage.message_id,
        taskCardChatId: chatId,
      });

      // Notify assignee if assigned
      if (assigneeId && assigneeUser) {
        await notificationService.notifyAssignment(task, assigneeUser, user);
      }
    } catch (error) {
      logger.error(`Error in /task command: ${error}`);
      await ctx.reply('❌ Failed to create task. Please try again.');
    }
  }
}

export const taskCommand = new TaskCommand();

