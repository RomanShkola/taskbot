import { BotContext } from 'src/bot/interface/context';
import { IUser, User } from 'src/database/models/user.model';
import logger from 'src/shared/logger/logger';

export class UserService {
  async upsertTelegramUser(telegramUser: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<IUser | null> {
    try {
      return await User.findOneAndUpdate(
        { telegramUserId: telegramUser.id },
        {
          $set: {
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
          },
          $setOnInsert: {
            telegramUserId: telegramUser.id,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );
    } catch (error) {
      logger.error(`Error upserting Telegram user ${telegramUser.id}: ${error}`);
      return null;
    }
  }

  async findOrCreateUser(ctx: BotContext): Promise<IUser | null> {
    try {
      const telegramUser = ctx.from;

      if (!telegramUser) {
        logger.warn('No user data found in context');
        return null;
      }

      return await this.upsertTelegramUser(telegramUser);
    } catch (error) {
      logger.error(`Error in findOrCreateUser: ${error}`);
      return null;
    }
  }

  async findUserByTelegramId(telegramUserId: number): Promise<IUser | null> {
    try {
      return await User.findOne({ telegramUserId });
    } catch (error) {
      logger.error(`Error finding user ${telegramUserId}: ${error}`);
      return null;
    }
  }

  async updateUser(telegramUserId: number, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      return await User.findOneAndUpdate({ telegramUserId }, { $set: updateData }, { new: true, runValidators: true });
    } catch (error) {
      logger.error(`Error updating user ${telegramUserId}: ${error}`);
      return null;
    }
  }

  async getUserCount(): Promise<number> {
    try {
      return await User.countDocuments();
    } catch (error) {
      logger.error(`Error getting user count: ${error}`);
      return 0;
    }
  }

  async findUsersByTelegramIds(telegramUserIds: number[]): Promise<IUser[]> {
    try {
      return await User.find({ telegramUserId: { $in: telegramUserIds } });
    } catch (error) {
      logger.error(`Error finding users by IDs: ${error}`);
      return [];
    }
  }

  getDisplayName(user: IUser | null, userId?: number): string {
    if (!user) {
      return userId ? `Пользователь ${userId}` : 'Неизвестный пользователь';
    }
    return user.username ? `@${user.username}` : user.firstName || `Пользователь ${user.telegramUserId}`;
  }
}

export const userService = new UserService();
