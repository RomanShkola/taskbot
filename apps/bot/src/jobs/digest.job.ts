import Bull from 'bull';
import { Group } from 'src/database/models/group.model';
import { taskService } from 'src/database/services/task.service';
import { Task } from 'src/database/models/task.model';
import { bot } from 'src/bot';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';

export async function processDigestJob(_job: Bull.Job): Promise<void> {
  logger.info('[DigestJob] Running daily digest...');

  try {
    const groups = await Group.find();

    for (const group of groups) {
      // Check if group has any tasks
      const stats = await taskService.getTaskStats(group._id);
      const total = stats.todo + stats.in_progress + stats.done;

      if (total === 0) continue;

      // Count completed today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const completedToday = await Task.countDocuments({
        groupId: group._id,
        status: 'done',
        completedAt: { $gte: startOfToday },
      });

      // Count overdue
      const now = new Date();
      const overdue = await Task.countDocuments({
        groupId: group._id,
        status: { $ne: 'done' },
        dueDate: { $lt: now },
      });

      let digest = `📊 *Daily Task Summary*\n`;
      digest += `━━━━━━━━━━━━━━━━━━━\n`;
      digest += `📝 Open: *${stats.todo}* tasks\n`;
      digest += `🔄 In Progress: *${stats.in_progress}* tasks\n`;
      digest += `✅ Completed today: *${completedToday}* tasks\n`;
      if (overdue > 0) {
        digest += `⚠️ Overdue: *${overdue}* tasks\n`;
      }

      const buttons: any[][] = [];
      if (configService.webappUrl) {
        buttons.push([{
          text: '📱 Open Board',
          web_app: { url: `${configService.webappUrl}?startapp=${group._id}` },
        }]);
      }

      try {
        await bot.telegram.sendMessage(group.telegramGroupId, digest, {
          parse_mode: 'Markdown',
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`Could not send digest to group ${group.telegramGroupId}: ${errMsg}`);
      }
    }

    logger.info('[DigestJob] Daily digest complete');
  } catch (error) {
    logger.error(`[DigestJob] Error: ${error}`);
    throw error;
  }
}
