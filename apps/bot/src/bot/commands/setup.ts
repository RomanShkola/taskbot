import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { telegramApiService } from 'src/shared/services/telegram-api.service';

interface BotCommand {
  command: string;
  description: string;
}

export class SetUpBotCommand {
  private commands: BotCommand[] = [];

  constructor() {
    this.commands = [
      {
        command: 'start',
        description: 'Start the bot and show welcome message',
      },
      {
        command: 'help',
        description: 'Show help information and available commands',
      },
      {
        command: 'task',
        description: 'Create a new task',
      },
      {
        command: 'tasks',
        description: 'View tasks in this chat',
      },
      {
        command: 'done',
        description: 'Mark a task as done',
      },
    ];
  }

  async process() {
    await telegramApiService.setMyCommands(this.commands);
    await this.setupMenuButton();
  }

  // Telegram only accepts an HTTPS URL for a web_app menu button, and the button
  // is configured as the default for all private chats (per-group web_app menu
  // buttons aren't supported by the Bot API).
  private async setupMenuButton() {
    const url = configService.webappUrl;
    if (!url || !url.startsWith('https://')) {
      logger.info('Skipping menu button setup — WEBAPP_URL is missing or not HTTPS');
      return;
    }

    await telegramApiService.setChatMenuButton('Task Board', url);
  }
}

export const setUpBotCommand = new SetUpBotCommand();
