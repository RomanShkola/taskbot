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
    const displayName = user?.firstName || user?.username || 'User';

    const welcomeMessage =
      `Welcome to TBot, ${displayName}! I help your team manage tasks right from Telegram.\n\n` +
      `Use /task to create tasks, /tasks to view them, or open the Mini App for the full board.`;

    const webappUrl = configService.webappUrl;
    if (webappUrl?.startsWith('https://')) {
      await ctx.reply(welcomeMessage, {
        reply_markup: {
          inline_keyboard: [[{ text: '📱 Open Task Board', web_app: { url: webappUrl } }]],
        },
      });
      return;
    }

    await ctx.reply(welcomeMessage);
  }
}

export const startCommand = new StartCommand();
