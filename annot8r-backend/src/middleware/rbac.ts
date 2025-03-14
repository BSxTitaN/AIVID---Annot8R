// src/middleware/rbac.ts
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { UserRole, type HonoContext } from '../types/index.js';
import { db } from '../config/index.js';
import { createMiddleware } from './core.js';

export function requireRoles(allowedRoles: UserRole[]) {
  return createMiddleware(async (c: Context<HonoContext>, next: Next) => {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized: User not authenticated' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions' });
    }
    
    await next();
  });
}

export const requireOfficeUser = () => createMiddleware(async (c: Context<HonoContext>, next: Next) => {
  const user = c.get('user');
  if (!user?.isOfficeUser) {
    throw new HTTPException(403, { message: 'Forbidden: Office user privileges required' });
  }
  
  await next();
});

export function requireProjectMember(role?: string) {
  return createMiddleware(async (c: Context<HonoContext>, next: Next) => {
    const user = c.get('user');
    const project = c.get('project');
    
    if (!user || !project) {
      throw new HTTPException(401, { message: 'Unauthorized: User or project not found' });
    }
    
    if (user.role === UserRole.SUPER_ADMIN) {
      return next();
    }
    
    const database = db.getDb();
    const query = { 
      projectId: project._id, 
      userId: user._id,
      ...(role ? { role } : {})
    };
    
    const projectMember = await database.collection('project_members').findOne(query);
    
    if (!projectMember) {
      throw new HTTPException(403, { message: 'Forbidden: Not a member of this project' });
    }
    
    await next();
  });
}