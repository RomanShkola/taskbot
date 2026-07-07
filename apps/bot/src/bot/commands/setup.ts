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
        description: 'Запустить бота',
      },
      {
        command: 'help',
        description: 'Показать справку',
      },
      {
        command: 'task',
        description: 'Создать задачу',
      },
      {
        command: 'tasks',
        description: 'Показать задачи в чате',
      },
      {
        command: 'done',
        description: 'Отметить задачу готовой',
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

    await telegramApiService.setChatMenuButton('Доска задач', url);
  }
}

export const setUpBotCommand = new SetUpBotCommand();
