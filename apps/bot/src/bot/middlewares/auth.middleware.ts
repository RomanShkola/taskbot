import { BotContext } from 'src/bot/interface/context';
import { groupService } from 'src/database/services/group.service';
import { groupMemberService } from 'src/database/services/group-member.service';
import { userService } from 'src/database/services/user.service';

export const authMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  // Auto-register group membership
  const chatType = ctx.chat?.type;
  if (chatType === 'group' || chatType === 'supergroup') {
    const user = await userService.findOrCreateUser(ctx);
    if (user && ctx.chat?.id) {
      const chatTitle = 'title' in ctx.chat ? (ctx.chat as { title: string }).title : 'Group';
      const group = await groupService.findOrCreateGroup(ctx.chat.id, chatTitle);
      if (group) {
        await groupMemberService.addMember(group._id, user._id, user.telegramUserId);
      }
    }
  }
  return next();
};
