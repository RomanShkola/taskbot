import mongoose from 'mongoose';
import { GroupMember, IGroupMember } from 'src/database/models/group-member.model';
import { IUser } from 'src/database/models/user.model';
import logger from 'src/shared/logger/logger';

export class GroupMemberService {
  async addMember(groupId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, telegramUserId: number): Promise<IGroupMember | null> {
    try {
      return await GroupMember.findOneAndUpdate(
        { groupId, userId },
        {
          $setOnInsert: {
            groupId,
            userId,
            telegramUserId,
            joinedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error(`Error adding group member: ${error}`);
      return null;
    }
  }

  async getMembers(groupId: mongoose.Types.ObjectId): Promise<IUser[]> {
    try {
      const members = await GroupMember.find({ groupId }).populate<{ userId: IUser }>('userId');
      return members.map((m) => m.userId as unknown as IUser).filter(Boolean);
    } catch (error) {
      logger.error(`Error getting group members: ${error}`);
      return [];
    }
  }

  async getUserGroups(userId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
    try {
      const members = await GroupMember.find({ userId }).select('groupId');
      return members.map((m) => m.groupId);
    } catch (error) {
      logger.error(`Error getting user groups: ${error}`);
      return [];
    }
  }
}

export const groupMemberService = new GroupMemberService();
