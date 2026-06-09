import { TASK_PRIORITY_ORDER, TaskPriority } from '@tbot/shared';
import { BotContext } from 'src/bot/interface/context';
import { buildTaskButtons, formatTaskCard, storeTaskCallbackData } from 'src/bot/task-card.renderer';
import { ITask, Task } from 'src/database/models/task.model';
import { IUser, User } from 'src/database/models/user.model';
import { groupMemberService } from 'src/database/services/group-member.service';
import { taskService } from 'src/database/services/task.service';
import { userService } from 'src/database/services/user.service';
import { callbackDataStorageService } from 'src/shared/services/callback-data-storage.service';
import logger from 'src/shared/logger/logger';
import { notificationService } from 'src/shared/services/notification.service';
import { InlineKeyboardButton } from 'telegraf/types';

interface TaskCallbackData {
  taskId: string;
  action: string;
  [key: string]: unknown;
}

export async function handleTaskCallback(ctx: BotContext) {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;

  const data = callbackQuery.data;
  if (!data?.startsWith('task:')) return;

  const parts = data.split(':');
  if (parts.length !== 3) return;

  const [, action, storageKey] = parts;

  try {
    const cbData = await callbackDataStorageService.getCallbackData<TaskCallbackData>(ctx, storageKey, 'task_cb');

    const task = await taskService.getTaskById(cbData.taskId);
    if (!task) {
      await ctx.answerCbQuery('Task not found.');
      return;
    }

    const fromUser = await userService.findUserByTelegramId(callbackQuery.from.id);
    if (!fromUser) {
      await ctx.answerCbQuery('User not recognized. Please /start first.');
      return;
    }

    switch (action) {
      case 'status_start':
        await handleStatusChange(ctx, task, 'in_progress', fromUser);
        break;
      case 'status_done':
        await handleStatusChange(ctx, task, 'done', fromUser);
        break;
      case 'status_reopen':
        await handleStatusChange(ctx, task, 'todo', fromUser);
        break;
      case 'priority':
        await handlePriorityCycle(ctx, task);
        break;
      case 'assign':
        await handleShowAssignPicker(ctx, task);
        break;
      case 'assign_to':
        await handleAssignTo(ctx, task, fromUser, String(cbData.assigneeUserId));
        break;
      case 'unassign':
        await handleUnassign(ctx, task);
        break;
      case 'assign_cancel':
        await handleAssignCancel(ctx, task);
        break;
      case 'delete':
        await handleDelete(ctx, task, fromUser);
        break;
      default:
        await ctx.answerCbQuery('Unknown action.');
    }
  } catch (error) {
    logger.error(`Task callback error: ${error}`);
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

async function handleStatusChange(ctx: BotContext, task: ITask, newStatus: string, user: IUser) {
  const updatedTask = await taskService.updateTaskStatus(task._id, newStatus);
  if (!updatedTask) {
    await ctx.answerCbQuery('Failed to update status.');
    return;
  }

  const statusText = newStatus === 'done' ? 'completed' : newStatus === 'in_progress' ? 'started' : 'reopened';
  const displayName = userService.getDisplayName(user);

  // Update the task card message
  await updateTaskCardMessage(ctx, updatedTask);

  // Post status change notification to group
  const chatId = ctx.chat?.id;
  if (chatId) {
    const emoji = newStatus === 'done' ? '✅' : newStatus === 'in_progress' ? '▶️' : '🔄';
    await ctx.telegram.sendMessage(
      chatId,
      `${emoji} ${displayName} ${statusText} *#${updatedTask.taskNumber}* — ${updatedTask.title}`,
      { parse_mode: 'Markdown' },
    );
  }

  // Notify assignee
  if (updatedTask.assigneeId) {
    const assignee = await User.findById(updatedTask.assigneeId);
    if (assignee && assignee.telegramUserId !== user.telegramUserId) {
      await notificationService.notifyStatusChange(updatedTask, user, assignee);
    }
  }

  await ctx.answerCbQuery(`Task ${statusText}!`);
}

async function handlePriorityCycle(ctx: BotContext, task: ITask) {
  const currentIndex = TASK_PRIORITY_ORDER.indexOf(task.priority as TaskPriority);
  const nextIndex = (currentIndex + 1) % TASK_PRIORITY_ORDER.length;
  const newPriority = TASK_PRIORITY_ORDER[nextIndex];

  const updatedTask = await taskService.updateTask(task._id, { priority: newPriority });
  if (!updatedTask) {
    await ctx.answerCbQuery('Failed to update priority.');
    return;
  }

  await updateTaskCardMessage(ctx, updatedTask);
  await ctx.answerCbQuery(`Priority: ${newPriority}`);
}

function getRefId(ref: unknown): string | null {
  if (!ref) return null;
  const value = ref as { _id?: { toString(): string }; toString(): string };
  return value._id ? value._id.toString() : value.toString();
}

async function handleShowAssignPicker(ctx: BotContext, task: ITask) {
  const members = await groupMemberService.getMembers(task.groupId);
  const currentAssigneeId = getRefId(task.assigneeId);

  const rows: InlineKeyboardButton[][] = [];
  let row: InlineKeyboardButton[] = [];

  for (const member of members) {
    const name = userService.getDisplayName(member);
    const isAssignee = currentAssigneeId === member._id.toString();
    const cbData = await storeTaskCallbackData(task._id.toString(), 'assign_to', {
      assigneeUserId: member._id.toString(),
    });
    row.push({ text: `${isAssignee ? '✅ ' : ''}${name}`, callback_data: cbData });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) rows.push(row);

  const unassignCb = await storeTaskCallbackData(task._id.toString(), 'unassign');
  const cancelCb = await storeTaskCallbackData(task._id.toString(), 'assign_cancel');
  rows.push([
    { text: '🚫 Unassign', callback_data: unassignCb },
    { text: '✖ Cancel', callback_data: cancelCb },
  ]);

  await ctx.editMessageReplyMarkup({ inline_keyboard: rows });
  await ctx.answerCbQuery('Select an assignee');
}

async function handleAssignTo(ctx: BotContext, task: ITask, actingUser: IUser, assigneeUserId: string) {
  const assignee = await User.findById(assigneeUserId);
  if (!assignee) {
    await ctx.answerCbQuery('User not found.');
    return;
  }

  const updatedTask = await taskService.assignTask(task._id, assignee._id);
  if (!updatedTask) {
    await ctx.answerCbQuery('Failed to update assignee.');
    return;
  }

  await updateTaskCardMessage(ctx, updatedTask);

  const assigneeName = userService.getDisplayName(assignee);
  const actingName = userService.getDisplayName(actingUser);
  const chatId = ctx.chat?.id;
  if (chatId) {
    await ctx.telegram.sendMessage(
      chatId,
      `👤 ${actingName} assigned ${assigneeName} to *#${updatedTask.taskNumber}*`,
      { parse_mode: 'Markdown' },
    );
  }

  await notificationService.notifyAssignment(updatedTask, assignee, actingUser);
  await ctx.answerCbQuery(`Assigned to ${assigneeName}`);
}

async function handleUnassign(ctx: BotContext, task: ITask) {
  const updatedTask = await taskService.assignTask(task._id, null);
  if (!updatedTask) {
    await ctx.answerCbQuery('Failed to update assignee.');
    return;
  }

  await updateTaskCardMessage(ctx, updatedTask);
  await ctx.answerCbQuery('Unassigned.');
}

async function handleAssignCancel(ctx: BotContext, task: ITask) {
  const buttons = await buildTaskButtons(task);
  await ctx.editMessageReplyMarkup({ inline_keyboard: buttons });
  await ctx.answerCbQuery();
}

async function canDeleteTask(ctx: BotContext, task: ITask, user: IUser): Promise<boolean> {
  if (getRefId(task.createdBy) === user._id.toString()) return true;

  const chatId = ctx.chat?.id;
  if (!chatId) return false;

  try {
    const member = await ctx.telegram.getChatMember(chatId, user.telegramUserId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (error) {
    logger.warn(`Could not check admin status for user ${user.telegramUserId}: ${error}`);
    return false;
  }
}

async function handleDelete(ctx: BotContext, task: ITask, user: IUser) {
  if (!(await canDeleteTask(ctx, task, user))) {
    await ctx.answerCbQuery('Only the task creator or a group admin can delete this task.', { show_alert: true });
    return;
  }

  const deleted = await taskService.deleteTask(task._id);
  if (!deleted) {
    await ctx.answerCbQuery('Failed to delete task.');
    return;
  }

  const displayName = userService.getDisplayName(user);

  // Try to delete the task card message
  try {
    await ctx.deleteMessage();
  } catch {
    // Message may already be deleted or too old
  }

  // Post deletion notification
  const chatId = ctx.chat?.id;
  if (chatId) {
    await ctx.telegram.sendMessage(chatId, `🗑 ${displayName} deleted *#${task.taskNumber}* — ${task.title}`, {
      parse_mode: 'Markdown',
    });
  }

  await ctx.answerCbQuery('Task deleted.');
}

async function updateTaskCardMessage(ctx: BotContext, task: ITask) {
  try {
    const creator = task.createdBy ? await User.findById(task.createdBy) : null;
    const assignee = task.assigneeId ? await User.findById(task.assigneeId) : null;

    const text = formatTaskCard(task, creator, assignee);
    const buttons = await buildTaskButtons(task);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (error) {
    logger.error(`Failed to update task card message: ${error}`);
  }
}
