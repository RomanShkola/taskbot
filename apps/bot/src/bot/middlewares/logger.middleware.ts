import { BotContext } from 'src/bot/interface/context';
import { userService } from 'src/database/services/user.service';
import logger from 'src/shared/logger/logger';
import { sessionService } from 'src/shared/services/session.service';
import { getIdsInTelegramContext } from 'src/shared/utils';

export const loggerMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  const { userId, chatId, type } = getIdsInTelegramContext(ctx);

  await userService.findOrCreateUser(ctx);

  const session = await sessionService.getSession(ctx);

  if (chatId) {
    logger.log({
      level: 'info',
      message: `User ${userId} make a ${type} in chat ${chatId}.`,
    });
    logger.info(`------CONTEXT ${userId} BEFORE is: \n${JSON.stringify(session)}`);
  }

  if (type === 'callback_query') {
    session.currentAction = undefined;
  } else {
    const message = (ctx.update as { message?: { text?: string } }).message?.text;
    if (message && message.startsWith('/')) {
      session.currentAction = undefined;
    }
  }

  return next();
};
