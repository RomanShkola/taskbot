import { Router, type Router as RouterType } from 'express';
import { taskController } from 'src/api/controllers/task.controller';
import { asyncHandler } from 'src/api/middlewares/error-handler.middleware';
import { validateObjectId } from 'src/api/middlewares/validate-object-id.middleware';

const router: RouterType = Router();

// Group-scoped task routes
router.get('/groups/:groupId/tasks', validateObjectId('groupId'), asyncHandler((req, res) => taskController.listTasks(req, res)));
router.post('/groups/:groupId/tasks', validateObjectId('groupId'), asyncHandler((req, res) => taskController.createTask(req, res)));
router.get('/groups/:groupId/stats', validateObjectId('groupId'), asyncHandler((req, res) => taskController.getStats(req, res)));

// Task-scoped routes
router.get('/tasks/:taskId', validateObjectId('taskId'), asyncHandler((req, res) => taskController.getTask(req, res)));
router.patch('/tasks/:taskId', validateObjectId('taskId'), asyncHandler((req, res) => taskController.updateTask(req, res)));
router.delete('/tasks/:taskId', validateObjectId('taskId'), asyncHandler((req, res) => taskController.deleteTask(req, res)));

export { router as taskRoutes };
