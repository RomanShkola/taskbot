import { botMessageHandler } from 'src/bot/bot-message-handler';
import { doneCommand } from 'src/bot/commands/done';
import { helpCommand } from 'src/bot/commands/help';
import { startCommand } from 'src/bot/commands/start';
import { taskCommand } from 'src/bot/commands/task';
import { tasksCommand } from 'src/bot/commands/tasks';
import { BotContext } from 'src/bot/interface/context';
import { handleTaskCallback } from 'src/bot/task-callback.handler';
import { authMiddleware } from 'src/bot/middlewares/auth.middleware';
import { loggerMiddleware } from 'src/bot/middlewares/logger.middleware';
import { mentionCheckMiddleware } from 'src/bot/middlewares/mention-check.middleware';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { Telegraf } from 'telegraf';

const bot = new Telegraf<BotContext>(configService.botToken, {
  telegram: {
    apiRoot: process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org',
  },
});

bot.use(loggerMiddleware);
bot.use(mentionCheckMiddleware);
bot.use(authMiddleware);

bot.start(async (ctx) => {
  await startCommand.onStart(ctx);
});

const publicCommands: Map<string, (ctx: BotContext) => void> = new Map<string, (ctx: BotContext) => void>([
  ...startCommand.register(),
  ...helpCommand.register(),
  ...taskCommand.register(),
  ...tasksCommand.register(),
  ...doneCommand.register(),
]);

Array.from(publicCommands).forEach(([command, callback]) => {
  bot.command(command, callback);
});

bot.on('message', async (ctx, next) => {
  const caption = 'caption' in ctx.message ? ctx.message.caption || '' : '';
  const match = caption.match(/^\/task(?:@([a-zA-Z0-9_]+))?(?:\s|$)/);

  if (!match) {
    return next();
  }

  const [, addressedBot] = match;
  const botUsername = ctx.botInfo?.username;

  if (addressedBot && botUsername && addressedBot.toLowerCase() !== botUsername.toLowerCase()) {
    return next();
  }

  await taskCommand.onTask(ctx);
});

// Handle task card button presses
bot.on('callback_query', async (ctx: BotContext) => {
  await handleTaskCallback(ctx);
});

bot.on('message', async (ctx: BotContext) => {
  await botMessageHandler.process(ctx);
});

bot.catch((error, _ctx) => {
  logger.error(error);
});

export { bot };
