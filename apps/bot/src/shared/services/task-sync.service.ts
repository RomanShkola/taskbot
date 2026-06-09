import { bot } from 'src/bot';
import { buildTaskButtons, formatTaskCard } from 'src/bot/task-card.renderer';
import { ITask, Task } from 'src/database/models/task.model';
import { User } from 'src/database/models/user.model';
import logger from 'src/shared/logger/logger';

export class TaskSyncService {
  /**
   * Sync task card in group chat (edit existing or post new)
   */
  async syncTaskCard(task: ITask) {
    try {
      const fullTask = await Task.findById(task._id).populate('createdBy assigneeId');
      if (!fullTask) return;

      const creator = fullTask.createdBy ? await User.findById(fullTask.createdBy) : null;
      const assignee = fullTask.assigneeId ? await User.findById(fullTask.assigneeId) : null;

      const text = formatTaskCard(fullTask, creator, assignee);
      const buttons = await buildTaskButtons(fullTask);

      if (fullTask.taskCardMessageId && fullTask.taskCardChatId) {
        // Try to edit existing message
        try {
          await bot.telegram.editMessageText(
            fullTask.taskCardChatId,
            fullTask.taskCardMessageId,
            undefined,
            text,
            { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } }
          );
          return;
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.includes('message is not modified')) return; // No change needed
          logger.warn(`Could not edit task card: ${errMsg}. Will post new card.`);
        }
      }

      // Post new card if no existing card or edit failed
      if (fullTask.taskCardChatId) {
        const newMsg = await bot.telegram.sendMessage(fullTask.taskCardChatId, text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        });

        await Task.findByIdAndUpdate(fullTask._id, {
          $set: { taskCardMessageId: newMsg.message_id },
        });
      }
    } catch (error) {
      logger.error(`Task sync error: ${error}`);
    }
  }

  /**
   * Post a status change notification to the group
   */
  async postStatusNotification(task: ITask, changedByUserId: string, action: string) {
    try {
      if (!task.taskCardChatId) return;

      const changedBy = await User.findById(changedByUserId);
      const name = changedBy?.username ? `@${changedBy.username}` : changedBy?.firstName || 'Someone';

      const msg = `📝 ${name} ${action} *#${task.taskNumber}* — ${task.title} (via app)`;
      await bot.telegram.sendMessage(task.taskCardChatId, msg, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error(`Status notification error: ${error}`);
    }
  }
}

export const taskSyncService = new TaskSyncService();
