import { BotContext } from 'src/bot/interface/context';
import { IUser, User } from 'src/database/models/user.model';
import logger from 'src/shared/logger/logger';

export class UserService {
  async findOrCreateUser(ctx: BotContext): Promise<IUser | null> {
    try {
      const telegramUser = ctx.from;

      if (!telegramUser) {
        logger.warn('No user data found in context');
        return null;
      }

      const telegramUserId = telegramUser.id;

      const user = await User.findOneAndUpdate(
        { telegramUserId },
        {
          $set: {
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
          },
          $setOnInsert: {
            telegramUserId,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      return user;
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
      return userId ? `User ${userId}` : 'Unknown User';
    }
    return user.username ? `@${user.username}` : user.firstName || `User ${user.telegramUserId}`;
  }
}

export const userService = new UserService();
