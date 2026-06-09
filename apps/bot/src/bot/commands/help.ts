import { BotContext } from 'src/bot/interface/context';

export class HelpCommand {
  private map: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set('help', this.onHelp.bind(this));
    return this.map;
  }

  async onHelp(ctx: BotContext) {
    const helpMessage =
      `📋 *TBot — Task Manager*\n\n` +
      `*Commands:*\n` +
      `/start — Show welcome message\n` +
      `/help — Show this help\n` +
      `/task — Create a task (reply to msg or type inline)\n` +
      `/tasks — View task summary and counts\n` +
      `/done — Mark a task as complete\n\n` +
      `*Usage examples:*\n` +
      `• Reply to a message with /task\n` +
      `• \`/task Deploy the API server\`\n` +
      `• \`/task Fix login bug @john\`\n` +
      `• \`/tasks mine\` or \`/tasks todo\`\n` +
      `• \`/done #5\``;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }
}

export const helpCommand = new HelpCommand();
