// src/routes/index.ts
import { Hono } from 'hono';
import type { HonoContext } from '../types/index.js';
import { errorHandler, logActivity } from '../middleware/index.js';
import { authRouter } from './auth.js';
import { userRouter } from './users.js';
import { adminRouter } from './admins.js';
import { adminDashboardRouter } from './admin-dashboard.js';
import { userProjectRouter } from './user-projects.js';
import { userDashboardRouter } from './user-dashboard.js'; // Import the new router
import { projectRouter } from './projects.js';
import { imageRouter } from './images.js';
import { assignmentRouter } from './assignments.js';
import { annotationRouter } from './annotations.js';
import { submissionRouter } from './submissions.js';
import { exportRouter } from './exports.js';

// Create main router
const apiRouter = new Hono<HonoContext>();

// Apply global middleware
apiRouter.use('*', errorHandler);

// Mount all route groups
apiRouter.route('/auth', authRouter);
apiRouter.route('/users', userRouter);
apiRouter.route('/admins', adminRouter);
apiRouter.route('/admin/dashboard', adminDashboardRouter);
apiRouter.route('/user/dashboard', userDashboardRouter); // Mount the new dashboard router
apiRouter.route('/user/projects', userProjectRouter);
apiRouter.route('/projects', projectRouter);
apiRouter.route('/projects/:projectId/images', imageRouter);
apiRouter.route('/projects/:projectId/assignments', assignmentRouter);
apiRouter.route('/projects/:projectId/submissions', submissionRouter);
apiRouter.route('/projects/:projectId/exports', exportRouter);
apiRouter.route('/user/projects/:projectId/images/:imageId/annotations', annotationRouter);

export { apiRouter };