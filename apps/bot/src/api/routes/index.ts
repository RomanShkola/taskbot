import { Router, type Router as RouterType } from 'express';
import { apiAuthMiddleware } from 'src/api/middlewares/auth.middleware';
import { groupRoutes } from 'src/api/routes/group.routes';
import { taskRoutes } from 'src/api/routes/task.routes';

const router: RouterType = Router();

// All API routes require auth
router.use(apiAuthMiddleware as any);

// Mount sub-routers
router.use('/groups', groupRoutes);
router.use('/', taskRoutes);

export { router as apiRouter };
