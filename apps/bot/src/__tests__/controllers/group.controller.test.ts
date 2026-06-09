import { GroupController } from 'src/api/controllers/group.controller';
import { groupMemberService } from 'src/database/services/group-member.service';
import { Group } from 'src/database/models/group.model';
import mongoose from 'mongoose';

jest.mock('src/database/services/group-member.service');
jest.mock('src/database/models/group.model');
jest.mock('src/shared/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockGroupId = new mongoose.Types.ObjectId();
const mockUserId = new mongoose.Types.ObjectId();

function createMockReqRes(overrides: Record<string, any> = {}) {
  const req: any = { params: {}, query: {}, body: {}, ...overrides };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('GroupController', () => {
  let controller: GroupController;

  beforeEach(() => {
    controller = new GroupController();
    jest.clearAllMocks();
  });

  describe('listGroups', () => {
    it('should return groups the user belongs to', async () => {
      const { req, res } = createMockReqRes({
        user: { _id: mockUserId },
      });

      const mockGroups = [{ _id: mockGroupId, groupName: 'Test Group' }];
      (groupMemberService.getUserGroups as jest.Mock).mockResolvedValue([mockGroupId]);
      (Group.find as jest.Mock).mockResolvedValue(mockGroups);

      await controller.listGroups(req, res);

      expect(groupMemberService.getUserGroups).toHaveBeenCalledWith(mockUserId);
      expect(res.json).toHaveBeenCalledWith({ data: mockGroups });
    });

    it('should return 401 when user is not authenticated', async () => {
      const { req, res } = createMockReqRes({});

      await controller.listGroups(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getMembers', () => {
    it('should return group members', async () => {
      const { req, res } = createMockReqRes({
        params: { groupId: mockGroupId.toString() },
      });

      const mockMembers = [{ username: 'john', firstName: 'John' }];
      (groupMemberService.getMembers as jest.Mock).mockResolvedValue(mockMembers);

      await controller.getMembers(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: mockMembers });
    });
  });
});
