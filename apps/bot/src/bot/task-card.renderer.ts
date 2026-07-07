import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TaskPriority, TaskStatus } from '@tbot/shared';
import { ITask } from 'src/database/models/task.model';
import { IUser } from 'src/database/models/user.model';
import { configService } from 'src/configs/configuration';
import { callbackDataStorageService } from 'src/shared/services/callback-data-storage.service';
import { InlineKeyboardButton } from 'telegraf/types';

const STATUS_EMOJI: Record<string, string> = {
  todo: '🔵',
  in_progress: '🟡',
  done: '🟢',
};

const PRIORITY_EMOJI: Record<string, string> = {
  low: '⚪',
  medium: '🟡',
  high: '🟠',
  urgent: '🔴',
};

function generateStorageKey(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function storeTaskCallbackData(taskId: string, action: string, extra?: Record<string, unknown>): Promise<string> {
  const key = generateStorageKey();
  await callbackDataStorageService.setCallbackData(key, 'task_cb', {
    taskId,
    action,
    ...extra,
  });
  return `task:${action}:${key}`;
}

export function formatTaskCard(task: ITask, creatorUser?: IUser | null, assigneeUser?: IUser | null): string {
  const statusLabel = TASK_STATUS_LABELS[task.status as TaskStatus] || task.status;
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority as TaskPriority] || task.priority;

  let card = `📋 *#${task.taskNumber}* ${escapeMarkdown(task.title)}\n`;
  card += `━━━━━━━━━━━━━━━━━━━\n`;
  card += `Статус: ${statusLabel}\n`;
  card += `Приоритет: ${priorityLabel}\n`;

  if (assigneeUser) {
    const name = assigneeUser.username ? `@${assigneeUser.username}` : assigneeUser.firstName || 'Неизвестно';
    card += `Исполнитель: ${name}\n`;
  }

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    card += `Срок: ${due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
  }

  if (creatorUser) {
    const creatorName = creatorUser.username ? `@${creatorUser.username}` : creatorUser.firstName || 'Неизвестно';
    card += `Создал: ${creatorName}\n`;
  }

  if (task.attachments && task.attachments.length > 0) {
    card += `Вложения: ${task.attachments.length}\n`;
  }

  if (task.sourceMessage?.link) {
    card += `\n💬 [Исходное сообщение](${task.sourceMessage.link})`;
  }

  return card;
}

export async function buildTaskButtons(task: ITask, userId?: string): Promise<InlineKeyboardButton[][]> {
  const rows: InlineKeyboardButton[][] = [];
  const taskId = task._id.toString();

  // Row 1: Status actions
  const row1: InlineKeyboardButton[] = [];

  if (task.status === 'todo') {
    const cbData = await storeTaskCallbackData(taskId, 'status_start');
    row1.push({ text: '▶ В работу', callback_data: cbData });
  }

  if (task.status === 'todo' || task.status === 'in_progress') {
    const cbData = await storeTaskCallbackData(taskId, 'status_done');
    row1.push({ text: '✅ Готово', callback_data: cbData });
  }

  if (task.status === 'done') {
    const cbData = await storeTaskCallbackData(taskId, 'status_reopen');
    row1.push({ text: '🔄 Вернуть', callback_data: cbData });
  }

  const priorityCb = await storeTaskCallbackData(taskId, 'priority');
  row1.push({ text: '🔼 Приоритет', callback_data: priorityCb });

  if (row1.length > 0) rows.push(row1);

  // Row 2: Assign + Delete
  const row2: InlineKeyboardButton[] = [];

  const assignCb = await storeTaskCallbackData(taskId, 'assign');
  row2.push({ text: '👤 Назначить', callback_data: assignCb });

  const deleteCb = await storeTaskCallbackData(taskId, 'delete');
  row2.push({ text: '🗑 Удалить', callback_data: deleteCb });

  rows.push(row2);

  // Row 3: Open in App — web_app buttons are private-chat only, so in groups we
  // use a t.me deep link (url button) into the bot's Main Mini App via startapp.
  // Telegram rejects the startapp link unless a Main Mini App is configured in
  // BotFather, so only render it when getMe reports has_main_web_app.
  if (configService.botUsername && configService.botHasMainWebApp) {
    const groupId = task.groupId.toString();
    rows.push([
      {
        text: '📱 Открыть в приложении',
        url: `https://t.me/${configService.botUsername}?startapp=${groupId}_${taskId}`,
      },
    ]);
  }

  return rows;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
