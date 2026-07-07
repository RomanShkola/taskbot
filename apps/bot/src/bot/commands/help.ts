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
      `📋 *TBot — управление задачами*\n\n` +
      `*Команды:*\n` +
      `/start — приветствие\n` +
      `/help — показать эту справку\n` +
      `/task — создать задачу (ответом на сообщение или текстом)\n` +
      `/tasks — показать сводку по задачам\n` +
      `/done — отметить задачу готовой\n\n` +
      `*Примеры:*\n` +
      `• Ответьте на сообщение командой /task\n` +
      `• \`/task Развернуть API\`\n` +
      `• \`/task Исправить вход @john\`\n` +
      `• \`/tasks mine\` или \`/tasks todo\`\n` +
      `• \`/done #5\``;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }
}

export const helpCommand = new HelpCommand();
