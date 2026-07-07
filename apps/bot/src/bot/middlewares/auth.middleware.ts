import { BotContext } from 'src/bot/interface/context';
import { groupService } from 'src/database/services/group.service';
import { groupMemberService } from 'src/database/services/group-member.service';
import { userService } from 'src/database/services/user.service';

export const authMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  // Auto-register group membership
  const chatType = ctx.chat?.type;
  if (chatType === 'group' || chatType === 'supergroup') {
    const user = await userService.findOrCreateUser(ctx);
    if (ctx.chat?.id) {
      const chatTitle = 'title' in ctx.chat ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(ctx.chat.id, chatTitle);
      if (group) {
        if (user) {
          await groupMemberService.addMember(group._id, user._id, user.telegramUserId);
        }

        const message = ctx.message;

        if (message && 'new_chat_members' in message && Array.isArray(message.new_chat_members)) {
          for (const telegramUser of message.new_chat_members) {
            if (telegramUser.is_bot) continue;
            const newUser = await userService.upsertTelegramUser(telegramUser);
            if (newUser) {
              await groupMemberService.addMember(group._id, newUser._id, newUser.telegramUserId);
            }
          }
        }

        const entities =
          message &&
          ((('entities' in message && message.entities) ||
            ('caption_entities' in message && message.caption_entities) ||
            []) as Array<{ type: string; user?: { id: number; username?: string; first_name?: string; last_name?: string; is_bot?: boolean } }>);

        if (entities) {
          for (const entity of entities) {
            if (entity.type !== 'text_mention' || !entity.user || entity.user.is_bot) continue;
            const mentionedUser = await userService.upsertTelegramUser(entity.user);
            if (mentionedUser) {
              await groupMemberService.addMember(group._id, mentionedUser._id, mentionedUser.telegramUserId);
            }
          }
        }
      }
    }
  }
  return next();
};
