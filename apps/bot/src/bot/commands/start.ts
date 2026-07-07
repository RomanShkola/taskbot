import { BotContext } from 'src/bot/interface/context';
import { configService } from 'src/configs/configuration';
import { userService } from 'src/database/services/user.service';

export class StartCommand {
  private map: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set('start', this.onStart.bind(this));
    return this.map;
  }

  async onStart(ctx: BotContext) {
    const user = await userService.findOrCreateUser(ctx);
    const displayName = user?.firstName || user?.username || 'пользователь';

    const welcomeMessage =
      `Добро пожаловать в TBot, ${displayName}! Я помогаю команде управлять задачами прямо в Telegram.\n\n` +
      `Используйте /task, чтобы создать задачу, /tasks, чтобы посмотреть список, или откройте Mini App для полной доски.`;

    const webappUrl = configService.webappUrl;
    if (webappUrl?.startsWith('https://')) {
      await ctx.reply(welcomeMessage, {
        reply_markup: {
          inline_keyboard: [[{ text: '📱 Открыть доску задач', web_app: { url: webappUrl } }]],
        },
      });
      return;
    }

    await ctx.reply(welcomeMessage);
  }
}

export const startCommand = new StartCommand();
