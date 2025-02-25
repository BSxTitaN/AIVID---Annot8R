// src/routes/image.routes.ts
import { Hono } from 'hono';
import { S3Service } from '../services/s3.service.js';
import { TokenService } from '../services/token.service.js';
import { webAuthMiddleware, adminAuthMiddleware } from '../middleware/auth.middleware.js';
import type { Admin, WebUser } from '../types/auth.types.js';

type Variables = {
  adminUser: Admin;
  user: WebUser;
};

const app = new Hono<{ Variables: Variables }>();

// Get image by token (proxied image access)
app.get('/:token', webAuthMiddleware, async (c) => {
  const imageToken = c.req.param('token');
  
  try {
    const tokenData = TokenService.verifyToken(imageToken);
    if (!tokenData) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const stream = await S3Service.getObject(tokenData.key);
    if (!stream) {
      return c.json({ error: 'Image not found' }, 404);
    }

    c.header('Cache-Control', 'no-store, must-revalidate, private');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Content-Type', 'image/jpeg');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    c.header('Content-Security-Policy', "default-src 'self'");
    
    return new Response(stream);
  } catch (error) {
    console.error('Error streaming image:', error);
    return c.json({ error: 'Failed to fetch image' }, 500);
  }
});

// Get all project images
app.get('/project/:projectId', webAuthMiddleware, async (c) => {
  const projectId = c.req.param('projectId');
  const cursor = c.req.query('cursor');
  const limit = parseInt(c.req.query('limit') || '30');
  const baseUrl = new URL(c.req.url).origin;

  try {
    const images = await S3Service.listProjectImages(
      projectId,
      baseUrl,
      cursor,
      limit
    );

    return c.json({ success: true, ...images });
  } catch (error) {
    console.error('Error listing project images:', error);
    return c.json({ success: false, error: 'Failed to list images' }, 500);
  }
});

// Upload images to project
app.post('/project/:projectId', webAuthMiddleware, async (c) => {
  const projectId = c.req.param('projectId');
  
  try {
    const formData = await c.req.formData();
    const files = [];
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && key === 'images') {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return c.json({ success: false, error: 'No files uploaded' }, 400);
    }
    
    const results = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        let dimensions;
        try {
          dimensions = { width: 0, height: 0 }; // Placeholder
        } catch (error) {
          console.warn('Failed to extract image dimensions:', error);
        }
        
        const success = await S3Service.uploadProjectImage(
          projectId,
          file.name,
          buffer,
          dimensions
        );
        
        return {
          filename: file.name,
          success
        };
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    
    return c.json({
      success: true,
      message: `Uploaded ${successCount} of ${files.length} images successfully`,
      results
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload images' 
    }, 500);
  }
});

// Delete project image
app.delete('/project/:projectId/:imageId', adminAuthMiddleware, async (c) => {
  const { projectId, imageId } = c.req.param();
  
  try {
    const success = await S3Service.deleteProjectImage(projectId, imageId);
    
    if (!success) {
      return c.json({ success: false, error: 'Failed to delete image' }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

export { app as imageRoutes };