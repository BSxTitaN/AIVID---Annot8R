// src/routes/image.routes.ts
import { Hono } from 'hono'
import { S3Service } from '../services/s3.service.js'
import { TokenService } from '../services/token.service.js'
import { webAuthMiddleware } from '../middleware/auth.middleware.js'

const app = new Hono()

app.use('/*', webAuthMiddleware)  // Add this to protect all routes

app.get('/images/:userId/:projectId/:slug', async (c) => {
  const { userId, projectId, slug } = c.req.param()
  const baseUrl = new URL(c.req.url).origin
  
  try {
    const imageData = await S3Service.getImageBySlug(userId, projectId, slug)
    if (!imageData) {
      return c.json({ error: 'Image not found' }, 404)
    }

    // Generate a token for the image using the key from imageData
    const token = TokenService.generateToken(imageData.key)
    const proxyUrl = `${baseUrl}/api/proxy/images/${token}`
    
    return c.json({
      url: proxyUrl,
      isAnnotated: imageData.isAnnotated,
      annotations: imageData.annotations
    })
  } catch (error) {
    console.error('Error generating image URL:', error)
    return c.json({ error: 'Failed to generate image URL' }, 500)
  }
})

export { app as imageRoutes }