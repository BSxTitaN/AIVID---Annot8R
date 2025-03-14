// src/middleware/index.ts
export { authenticate } from './auth.js';
export { requireRoles, requireOfficeUser, requireProjectMember } from './rbac.js';
export { logActivity } from './logger.js';
export { errorHandler } from './error.js';