import { Request, Response, NextFunction } from 'express';
import { validate, parse } from '@telegram-apps/init-data-node';
import { configService } from 'src/configs/configuration';
import { userService } from 'src/database/services/user.service';
import { User } from 'src/database/models/user.model';
import logger from 'src/shared/logger/logger';

export interface AuthenticatedRequest extends Request {
  user?: InstanceType<typeof User>;
  telegramUserId?: number;
}

export const apiAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('tma ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header', statusCode: 401 });
    return;
  }

  const initData = authHeader.slice(4);

  try {
    // Validate the initData HMAC signature
    validate(initData, configService.botToken, { expiresIn: 86400 }); // 24h expiry

    // Parse to extract user info
    const parsed = parse(initData);
    const telegramUser = parsed.user;

    if (!telegramUser) {
      res.status(401).json({ error: 'Unauthorized', message: 'No user data in initData', statusCode: 401 });
      return;
    }

    // Find or create user in DB
    const user = await User.findOneAndUpdate(
      { telegramUserId: telegramUser.id },
      {
        $set: {
          username: telegramUser.username,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName,
        },
        $setOnInsert: {
          telegramUserId: telegramUser.id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    req.user = user;
    req.telegramUserId = telegramUser.id;
    next();
  } catch (error) {
    logger.error(`API auth error: ${error}`);
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired initData', statusCode: 401 });
    return;
  }
};
