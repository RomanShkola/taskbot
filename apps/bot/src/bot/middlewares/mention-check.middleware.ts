import { BotContext } from 'src/bot/interface/context';
import logger from 'src/shared/logger/logger';

export const mentionCheckMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  const chatType = ctx.chat?.type;

  if (chatType === 'private') {
    return next();
  }

  if (ctx.callbackQuery) {
    return next();
  }

  if (chatType === 'group' || chatType === 'supergroup' || chatType === 'channel') {
    const botUsername = ctx.botInfo?.username;

    if (!botUsername) {
      logger.warn('Bot username not available');
      return next();
    }

    if (ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      if (ctx.message.reply_to_message.from?.username === botUsername) {
        return next();
      }
    }

    if (!ctx.message) {
      return;
    }

    const messageText =
      ('text' in ctx.message && ctx.message.text) ||
      ('caption' in ctx.message && ctx.message.caption) ||
      '';

    if (!messageText) {
      return;
    }

    const mentionPattern = `@${botUsername}`;

    if (messageText.startsWith('/')) {
      logger.info(`Bot command in ${chatType} by user ${ctx.from?.id}: ${messageText}`);
      return next();
    }

    if (messageText.includes(mentionPattern)) {
      logger.info(`Bot mentioned in ${chatType} by user ${ctx.from?.id}`);
      return next();
    }

    const entities =
      ('entities' in ctx.message && ctx.message.entities) ||
      ('caption_entities' in ctx.message && ctx.message.caption_entities) ||
      [];
    const isMentioned = entities.some((entity) => {
      if (entity.type === 'mention') {
        const mention = messageText.substring(entity.offset, entity.offset + entity.length);
        return mention === mentionPattern;
      }
      if (entity.type === 'text_mention') {
        return entity.user?.username === botUsername;
      }
      return false;
    });

    if (isMentioned) {
      logger.info(`Bot mentioned (via entity) in ${chatType} by user ${ctx.from?.id}`);
      return next();
    }

    logger.debug(`Bot not mentioned in ${chatType}, ignoring message from user ${ctx.from?.id}`);
    return;
  }

  return next();
};
