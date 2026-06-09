import { configService } from 'src/configs/configuration';
import { AIProvider, ChatMessage } from 'src/shared/services/ai/ai.interface';
import { FuseProvider } from 'src/shared/services/ai/fuse.provider';
import { GeminiProvider } from 'src/shared/services/ai/gemini.provider';

class AIService {
  private provider: AIProvider;

  constructor() {
    const providerType = configService.ai.provider.toLowerCase();

    switch (providerType) {
      case 'fuse':
        this.provider = new FuseProvider();
        break;
      case 'gemini':
        this.provider = new GeminiProvider();
        break;
      default:
        this.provider = new GeminiProvider();
    }
  }

  async chat(messages: ChatMessage[]) {
    return this.provider.chat(messages);
  }
}

export const aiService = new AIService();
