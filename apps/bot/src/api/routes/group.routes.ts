import { Router, type Router as RouterType } from 'express';
import { groupController } from 'src/api/controllers/group.controller';
import { asyncHandler } from 'src/api/middlewares/error-handler.middleware';
import { validateObjectId } from 'src/api/middlewares/validate-object-id.middleware';

const router: RouterType = Router();

router.get('/', asyncHandler((req, res) => groupController.listGroups(req, res)));
router.get('/:groupId/members', validateObjectId('groupId'), asyncHandler((req, res) => groupController.getMembers(req, res)));

export { router as groupRoutes };
