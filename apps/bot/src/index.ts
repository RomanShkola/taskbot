import 'dotenv/config';

import { bot } from 'src/bot';
import { setUpBotCommand } from 'src/bot/commands/setup';
import { configService } from 'src/configs/configuration';
import { mongodbConnection } from 'src/database/connection';
import { processReminderJob } from 'src/jobs/reminder.job';
import { processDigestJob } from 'src/jobs/digest.job';
import { app } from 'src/server';
import logger from 'src/shared/logger/logger';
import { queueService } from 'src/shared/services/queue.service';

async function bootstrap() {
  await mongodbConnection.ensureConnection();

  const botInfo = await bot.telegram.getMe();
  configService.botUsername = botInfo.username;
  configService.botHasMainWebApp = Boolean((botInfo as { has_main_web_app?: boolean }).has_main_web_app);
  logger.info(`Bot @${botInfo.username} started (main mini app: ${configService.botHasMainWebApp})`);

  await setUpBotCommand.process();

  // Register job processors
  queueService.registerProcessor('due-reminder', processReminderJob);
  queueService.registerProcessor('daily-digest', processDigestJob);

  // Schedule recurring jobs
  await queueService.addRepeatingJob('due-reminder', {}, '0 * * * *'); // Every hour
  await queueService.addRepeatingJob('daily-digest', {}, '0 9 * * *'); // Daily at 9 AM UTC

  const port = process.env.PORT || 3000;

  if (process.env.WEBHOOK_URL) {
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/bot/webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    app.use(bot.webhookCallback('/api/bot/webhook'));
    logger.info(`Webhook set to ${webhookUrl}`);
  } else {
    bot.launch();
    logger.info('Bot started in polling mode');
  }

  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down...`);
  bot.stop(signal);
  await queueService.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => logger.error(`Uncaught Exception: ${err}`));
process.on('unhandledRejection', (err) => logger.error(`Unhandled Rejection: ${err}`));

bootstrap().catch((err) => {
  logger.error(`Bootstrap failed: ${err}`);
  process.exit(1);
});

