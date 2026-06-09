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

const bot = new Telegraf<BotContext>(configService.botToken);

bot.use(loggerMiddleware);
bot.use(mentionCheckMiddleware);

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

bot.use(authMiddleware);

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

