import { BotContext } from 'src/bot/interface/context';
import { buildTaskButtons, formatTaskCard } from 'src/bot/task-card.renderer';
import { ITaskAttachment } from 'src/database/models/task.model';
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
        await ctx.reply('⚠️ /task можно использовать только в групповых чатах.');
        return;
      }

      const user = await userService.findOrCreateUser(ctx);
      if (!user) {
        await ctx.reply('❌ Не удалось определить пользователя. Отправьте /start еще раз.');
        return;
      }

      const chatTitle = 'title' in ctx.chat! ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(chatId, chatTitle);
      if (!group) {
        await ctx.reply('❌ Не удалось настроить эту группу. Попробуйте еще раз.');
        return;
      }

      const message = ctx.message;
      if (!message) return;

      // Check if this is a reply to a message
      const replyTo = 'reply_to_message' in message ? message.reply_to_message : null;
      const messageText =
        ('text' in message && message.text) ||
        ('caption' in message && message.caption) ||
        '';
      const args = messageText.replace(/^\/task(@\w+)?\s*/, '').trim();

      let title: string;
      let description: string | undefined;
      let assigneeId: typeof user._id | undefined;
      let sourceMessage: { messageId: number; chatId: number; text: string; fromUserId: number; link: string } | undefined;
      let attachments: ITaskAttachment[] = [];

      if (replyTo) {
        // Reply flow: create task from replied message
        const replyText =
          ('text' in replyTo && replyTo.text) ||
          ('caption' in replyTo && replyTo.caption) ||
          '';
        const lines = replyText.split('\n');
        title = (args || lines[0]).substring(0, 200);
        description = replyText || undefined;

        if (!title) {
          title = 'Задача из сообщения';
        }

        // Build source message link
        const link =
          chatType === 'supergroup'
            ? `https://t.me/c/${String(chatId).replace('-100', '')}/${replyTo.message_id}`
            : '';

        sourceMessage = {
          messageId: replyTo.message_id,
          chatId,
          text: replyText.substring(0, 2000),
          fromUserId: replyTo.from?.id || 0,
          link,
        };
        attachments = extractTaskAttachments(replyTo);
      } else if (args) {
        // Direct flow: /task Deploy the new API server
        title = args;
        attachments = extractTaskAttachments(message);
      } else {
        await ctx.reply(
          '📋 *Как использовать:*\n' +
            '• Ответьте на сообщение командой /task, чтобы создать задачу из него\n' +
            '• `/task Развернуть API` — создать задачу напрямую\n' +
            '• `/task Исправить баг @user` — создать и назначить',
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
      const entities =
        ('entities' in message && message.entities) ||
        ('caption_entities' in message && message.caption_entities) ||
        [];

      if (!assigneeId && entities.length > 0) {
        for (const entity of entities) {
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
        attachments,
      });

      // Send rich task card with inline buttons
      const assigneeUser = assigneeId ? await User.findById(assigneeId) : null;
      const cardText = formatTaskCard(task, user, assigneeUser);
      const buttons = await buildTaskButtons(task);

      const cardMessage = await sendTaskCard(ctx, cardText, buttons, attachments);

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
      await ctx.reply('❌ Не удалось создать задачу. Попробуйте еще раз.');
    }
  }
}

export const taskCommand = new TaskCommand();

async function sendTaskCard(
  ctx: BotContext,
  cardText: string,
  buttons: Awaited<ReturnType<typeof buildTaskButtons>>,
  attachments: ITaskAttachment[],
) {
  const primaryAttachment = attachments.find((attachment) =>
    ['photo', 'video', 'animation', 'document', 'audio', 'voice'].includes(attachment.type)
  );
  const extra = {
    caption: cardText,
    parse_mode: 'Markdown' as const,
    reply_markup: { inline_keyboard: buttons },
  };

  try {
    switch (primaryAttachment?.type) {
      case 'photo':
        return await ctx.replyWithPhoto(primaryAttachment.fileId, extra);
      case 'video':
        return await ctx.replyWithVideo(primaryAttachment.fileId, extra);
      case 'animation':
        return await ctx.replyWithAnimation(primaryAttachment.fileId, extra);
      case 'document':
        return await ctx.replyWithDocument(primaryAttachment.fileId, extra);
      case 'audio':
        return await ctx.replyWithAudio(primaryAttachment.fileId, extra);
      case 'voice':
        return await ctx.replyWithVoice(primaryAttachment.fileId, extra);
      default:
        return await ctx.reply(cardText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        });
    }
  } catch (error) {
    logger.warn(`Failed to send task card with media preview: ${error}`);
    return await ctx.reply(cardText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }
}

function extractTaskAttachments(message: Record<string, any>): ITaskAttachment[] {
  const attachments: ITaskAttachment[] = [];

  if ('photo' in message && Array.isArray(message.photo) && message.photo.length > 0) {
    const photo = [...message.photo].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
    attachments.push({
      type: 'photo',
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
      fileSize: photo.file_size,
      width: photo.width,
      height: photo.height,
    });
  }

  if ('video' in message && message.video) {
    attachments.push(buildMediaAttachment('video', message.video));
  }

  if ('animation' in message && message.animation) {
    attachments.push(buildMediaAttachment('animation', message.animation));
  }

  if ('document' in message && message.document) {
    attachments.push(buildMediaAttachment('document', message.document));
  }

  if ('audio' in message && message.audio) {
    attachments.push(buildMediaAttachment('audio', message.audio));
  }

  if ('voice' in message && message.voice) {
    attachments.push(buildMediaAttachment('voice', message.voice));
  }

  if ('video_note' in message && message.video_note) {
    attachments.push(buildMediaAttachment('video_note', message.video_note));
  }

  if ('sticker' in message && message.sticker) {
    attachments.push(buildMediaAttachment('sticker', message.sticker));
  }

  return attachments;
}

function buildMediaAttachment(type: ITaskAttachment['type'], media: Record<string, any>): ITaskAttachment {
  return {
    type,
    fileId: media.file_id,
    fileUniqueId: media.file_unique_id,
    fileName: media.file_name,
    mimeType: media.mime_type,
    fileSize: media.file_size,
    width: media.width,
    height: media.height || media.length,
    duration: media.duration,
    thumbnailFileId: media.thumbnail?.file_id || media.thumb?.file_id,
  };
}
