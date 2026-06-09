import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from 'src/api/middlewares/auth.middleware';
import { Group } from 'src/database/models/group.model';
import { groupMemberService } from 'src/database/services/group-member.service';

export class GroupController {
  async listGroups(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?._id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupIds = await groupMemberService.getUserGroups(userId);
    const groups = await Group.find({ _id: { $in: groupIds } });

    res.json({ data: groups });
  }

  async getMembers(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const members = await groupMemberService.getMembers(
      new mongoose.Types.ObjectId(groupId)
    );

    res.json({ data: members });
  }
}

export const groupController = new GroupController();
