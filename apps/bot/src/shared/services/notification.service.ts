import { TASK_STATUS_LABELS, TaskStatus } from '@tbot/shared';
import { bot } from 'src/bot';
import { ITask } from 'src/database/models/task.model';
import { IUser } from 'src/database/models/user.model';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { Group } from 'src/database/models/group.model';
import { redisService } from 'src/shared/services/redis.service';

const NOTIFICATION_WINDOW_SECONDS = 300;

export class NotificationService {
  // Limit DMs to one per task per user within the window to avoid spamming on rapid edits.
  private async shouldNotify(taskId: string, telegramUserId: number): Promise<boolean> {
    const key = `notif:${taskId}:${telegramUserId}`;
    try {
      const existing = await redisService.get(key);
      if (existing) return false;
      await redisService.set(key, '1', { EX: NOTIFICATION_WINDOW_SECONDS });
      return true;
    } catch (error) {
      logger.warn(`Notification rate-limit check failed for ${key}: ${error}`);
      return true;
    }
  }

  async notifyAssignment(task: ITask, assignee: IUser, assignedBy: IUser) {
    // Don't notify self-assignments
    if (assignee.telegramUserId === assignedBy.telegramUserId) return;
    if (!(await this.shouldNotify(task._id.toString(), assignee.telegramUserId))) return;

    try {
      const group = await Group.findById(task.groupId);
      const groupName = group?.groupName || 'a group';
      const byName = assignedBy.username ? `@${assignedBy.username}` : assignedBy.firstName || 'Someone';

      let message = `📋 *You were assigned to #${task.taskNumber}*\n`;
      message += `"${task.title}"\n`;
      message += `By: ${byName}\n`;
      message += `Group: ${groupName}`;

      if (configService.webappUrl) {
        const groupId = task.groupId.toString();
        const taskId = task._id.toString();
        message += `\n\n📱 [Open in App](${configService.webappUrl}?startapp=${groupId}_${taskId})`;
      }

      await bot.telegram.sendMessage(assignee.telegramUserId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error: unknown) {
      // User may not have started the bot — Telegram will reject the DM
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('bot was blocked') || errMsg.includes('chat not found') || errMsg.includes('FORBIDDEN')) {
        logger.info(`Can't DM user ${assignee.telegramUserId} — bot not started or blocked`);
      } else {
        logger.error(`Notification error for user ${assignee.telegramUserId}: ${errMsg}`);
      }
    }
  }

  async notifyStatusChange(task: ITask, changedBy: IUser, assignee: IUser) {
    if (assignee.telegramUserId === changedBy.telegramUserId) return;
    if (!(await this.shouldNotify(task._id.toString(), assignee.telegramUserId))) return;

    try {
      const group = await Group.findById(task.groupId);
      const groupName = group?.groupName || 'a group';
      const byName = changedBy.username ? `@${changedBy.username}` : changedBy.firstName || 'Someone';
      const statusLabel = TASK_STATUS_LABELS[task.status as TaskStatus] || task.status;

      let message = `🔔 *Task #${task.taskNumber} updated*\n`;
      message += `"${task.title}"\n`;
      message += `Status: ${statusLabel}\n`;
      message += `Changed by: ${byName}\n`;
      message += `Group: ${groupName}`;

      await bot.telegram.sendMessage(assignee.telegramUserId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('bot was blocked') || errMsg.includes('chat not found') || errMsg.includes('FORBIDDEN')) {
        logger.info(`Can't DM user ${assignee.telegramUserId} — bot not started or blocked`);
      } else {
        logger.error(`Notification error for user ${assignee.telegramUserId}: ${errMsg}`);
      }
    }
  }

  async notifyDueReminder(task: ITask, targetUser: IUser) {
    try {
      const group = await Group.findById(task.groupId);
      const groupName = group?.groupName || 'a group';
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const dueStr = dueDate
        ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'soon';

      let message = `⏰ *Task #${task.taskNumber} is due ${dueStr}*\n`;
      message += `"${task.title}"\n`;
      message += `Group: ${groupName}`;

      await bot.telegram.sendMessage(targetUser.telegramUserId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Due reminder notification error: ${errMsg}`);
    }
  }
}

export const notificationService = new NotificationService();
