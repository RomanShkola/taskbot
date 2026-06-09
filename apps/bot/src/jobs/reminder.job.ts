import Bull from 'bull';
import { Task } from 'src/database/models/task.model';
import { User } from 'src/database/models/user.model';
import { notificationService } from 'src/shared/services/notification.service';
import logger from 'src/shared/logger/logger';

export async function processReminderJob(_job: Bull.Job): Promise<void> {
  logger.info('[ReminderJob] Running due date reminder check...');

  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within next 24 hours that haven't been reminded
    const tasks = await Task.find({
      dueDate: { $lte: in24Hours, $gte: now },
      status: { $ne: 'done' },
      reminderSent: { $ne: true },
    });

    logger.info(`[ReminderJob] Found ${tasks.length} tasks due within 24 hours`);

    for (const task of tasks) {
      // Send to assignee or creator
      const targetUserId = task.assigneeId || task.createdBy;
      const targetUser = await User.findById(targetUserId);

      if (targetUser) {
        await notificationService.notifyDueReminder(task, targetUser);
      }

      // Mark as reminded
      await Task.findByIdAndUpdate(task._id, { $set: { reminderSent: true } });
    }

    logger.info(`[ReminderJob] Sent ${tasks.length} reminders`);
  } catch (error) {
    logger.error(`[ReminderJob] Error: ${error}`);
    throw error;
  }
}
