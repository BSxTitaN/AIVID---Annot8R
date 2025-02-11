// src/routes/project.routes.ts
import { Hono } from 'hono'
import { S3Service } from '../services/s3.service.js'
import { adminAuthMiddleware, webAuthMiddleware } from '../middleware/auth.middleware.js'
import { SecurityLogService } from '../services/log.service.js'
import { SecurityLogType } from '../types/log.types.js'
import { Admins } from '../config/mongo.js'

const app = new Hono()

app.use('/*', webAuthMiddleware)  // Add this to protect all routes

app.get('/projects/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  try {
    // Get all projects first with their submission status
    const projects = await S3Service.listProjects(userId)
    
    // For each project, get the image stats
    const projectsWithStats = await Promise.all(
      projects
        .filter((project): project is NonNullable<typeof project> => project !== null)
        .map(async (project) => {
          const images = await S3Service.listImages(
            userId,
            project.id!,
            new URL(c.req.url).origin,
            undefined,
            1
          )

          // Log the metadata for debugging
          console.log(`Returning project ${project.id} with submission status:`, {
            isSubmitted: project.isSubmitted,
            submittedAt: project.submittedAt
          });
          
          return {
            ...project, // This will include isSubmitted and submittedAt
            totalImages: images.pagination.total,
            annotatedImages: images.pagination.annotatedTotal,
            remainingImages: images.pagination.annotationRemaining
          }
        })
    )
    
    return c.json({ projects: projectsWithStats })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return c.json({ error: 'Failed to fetch projects' }, 500)
  }
})

app.get('/projects/:userId/:projectId/images', async (c) => {
  const { userId, projectId } = c.req.param()
  const { cursor, limit } = c.req.query()
  const baseUrl = new URL(c.req.url).origin
  
  try {
    // Get project metadata first
    const metadata = await S3Service.getProjectMetadata(userId, projectId);
    
    // Parse the limit parameter
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    
    const response = await S3Service.listImages(
      userId, 
      projectId, 
      baseUrl,
      cursor,
      parsedLimit
    )

    // Include submission status in response
    return c.json({
      ...response,
      isSubmitted: metadata.isSubmitted || false,
      submittedAt: metadata.submittedAt
    })
  } catch (error) {
    console.error('Error fetching images:', error)
    return c.json({ error: 'Failed to fetch images' }, 500)
  }
})

app.post('/projects/:userId/:projectId/submit', async (c) => {
  const { userId, projectId } = c.req.param();
  
  try {
    const success = await S3Service.submitProject(userId, projectId);
    if (!success) {
      return c.json({ error: 'Failed to submit project' }, 500);
    }
    
    // Log the submission
    await SecurityLogService.logSecurityEvent(
      userId,
      SecurityLogType.PROJECT_SUBMITTED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Project: ${projectId}`
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error submitting project:', error);
    return c.json({ error: 'Failed to submit project' }, 500);
  }
});

// Add to auth.routes.ts
app.post('/auth/users/:username/projects/:projectId/unsubmit', adminAuthMiddleware, async (c) => {
  const { username, projectId } = c.req.param();
  
  try {
    const success = await S3Service.unsubmitProject(username, projectId);
    if (!success) {
      return c.json({ error: 'Failed to update project status' }, 500);
    }
    
    // Log the action
    const adminToken = c.req.header('Authorization')?.replace('Bearer ', '');
    const admin = await Admins.findOne({ accessToken: adminToken });
    
    await SecurityLogService.logSecurityEvent(
      username,
      SecurityLogType.PROJECT_UNMARKED,
      {
        userAgent: c.req.header('user-agent') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        path: c.req.path,
        additionalInfo: `Project: ${projectId}, Unmarked by: ${admin?.username}`
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating project status:', error);
    return c.json({ error: 'Failed to update project status' }, 500);
  }
});

export { app as projectRoutes }