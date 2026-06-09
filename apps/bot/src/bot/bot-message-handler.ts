import { BotContext } from 'src/bot/interface/context';

class BotMessageHandler {
  async process(_ctx: BotContext): Promise<void> {
    // No default message handling for now
  }
}

export const botMessageHandler = new BotMessageHandler();
