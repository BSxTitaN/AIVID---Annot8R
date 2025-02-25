// src/routes/annotation.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { adminAuthMiddleware, webAuthMiddleware } from '../middleware/auth.middleware.js';
import { ProjectService } from '../services/project.service.js';
import { S3Service } from '../services/s3.service.js';
import { SecurityLogService } from '../services/log.service.js';
import { SecurityLogType } from '../types/log.types.js';
import type { Admin, WebUser } from '../types/auth.types.js';

// Define context variable types
type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Schema Validation
const annotationSchema = z.object({
  class: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0)
});

const updateAnnotationsSchema = z.object({
  annotations: z.array(annotationSchema),
  customClass: z.string().optional()
});

const reviewSchema = z.object({
  status: z.enum(['approved', 'changes_requested']),
  feedback: z.string().optional()
});

// Get Image Annotations
app.get('/projects/:projectId/images/:imageId/annotations', webAuthMiddleware, async (c) => {
  try {
    const { projectId, imageId } = c.req.param();
    const user = c.get('user');

    // Verify user has access to this project's images
    const assignments = await ProjectService.getMemberAssignments(projectId, user.username, 1, 1);
    if (assignments.total === 0) {
      return c.json({ success: false, error: 'Not authorized to access this project' }, 403);
    }

    const annotations = await S3Service.getImageAnnotations(projectId, imageId);
    return c.json({ success: true, annotations });
  } catch (error) {
    console.error('Error getting annotations:', error);
    return c.json({ success: false, error: 'Failed to get annotations' }, 500);
  }
});

// Update Image Annotations
app.post('/projects/:projectId/images/:imageId/annotations', 
  webAuthMiddleware,
  zValidator('json', updateAnnotationsSchema),
  async (c) => {
    try {
      const { projectId, imageId } = c.req.param();
      const user = c.get('user');
      const { annotations, customClass } = await c.req.json();

      // Verify user has access and image is assigned to them
      const assignments = await ProjectService.getMemberAssignments(projectId, user.username, 1, 1);
      if (assignments.total === 0) {
        return c.json({ success: false, error: 'Not authorized to access this project' }, 403);
      }

      // Save annotations
      const success = await S3Service.saveImageAnnotations(projectId, imageId, annotations);
      if (!success) {
        return c.json({ success: false, error: 'Failed to save annotations' }, 500);
      }

      // If custom class provided and allowed, add it
      if (customClass) {
        const existingClasses = await S3Service.getClasses(projectId);
        if (!existingClasses.includes(customClass)) {
          await S3Service.saveClasses(projectId, [...existingClasses, customClass]);
        }
      }

      // Log annotation update
      await SecurityLogService.logSecurityEvent(
        user.username,
        SecurityLogType.ANNOTATION_UPDATED,
        {
          userAgent: c.req.header('user-agent') || 'unknown',
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
          path: c.req.path,
          additionalInfo: `Updated annotations for image: ${imageId}`
        }
      );

      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating annotations:', error);
      return c.json({ success: false, error: 'Failed to update annotations' }, 500);
    }
});

// Review Annotations (Admin Only)
app.post('/projects/:projectId/images/:imageId/review',
  adminAuthMiddleware,
  zValidator('json', reviewSchema),
  async (c) => {
    try {
      const { projectId, imageId } = c.req.param();
      const adminUser = c.get('adminUser');
      const { status, feedback } = await c.req.json();

      // Update review status
      const success = await ProjectService.updateAnnotationReview(
        projectId,
        imageId,
        adminUser.username,
        status,
        feedback
      );

      if (!success) {
        return c.json({ success: false, error: 'Failed to update review status' }, 500);
      }

      // Log review action
      await SecurityLogService.logSecurityEvent(
        adminUser.username,
        SecurityLogType.ANNOTATION_REVIEWED,
        {
          userAgent: c.req.header('user-agent') || 'unknown',
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
          path: c.req.path,
          additionalInfo: `Reviewed annotations for image: ${imageId} - Status: ${status}`
        }
      );

      return c.json({ success: true });
    } catch (error) {
      console.error('Error reviewing annotations:', error);
      return c.json({ success: false, error: 'Failed to review annotations' }, 500);
    }
});

// Get Project Classes
app.get('/projects/:projectId/classes', webAuthMiddleware, async (c) => {
  try {
    const { projectId } = c.req.param();
    const classes = await S3Service.getClasses(projectId);
    return c.json({ success: true, classes });
  } catch (error) {
    console.error('Error getting classes:', error);
    return c.json({ success: false, error: 'Failed to get classes' }, 500);
  }
});

// Update Project Classes (Admin Only)
app.put('/projects/:projectId/classes',
  adminAuthMiddleware,
  zValidator('json', z.object({ classes: z.array(z.string()) })),
  async (c) => {
    try {
      const { projectId } = c.req.param();
      const { classes } = await c.req.json();

      const success = await S3Service.saveClasses(projectId, classes);
      if (!success) {
        return c.json({ success: false, error: 'Failed to update classes' }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error('Error updating classes:', error);
      return c.json({ success: false, error: 'Failed to update classes' }, 500);
    }
});

export { app as annotationRoutes };