// src/routes/proxy.routes.ts
import { Hono } from 'hono'
import { TokenService } from '../services/token.service.js'
import { S3Service } from '../services/s3.service.js'
import { webAuthMiddleware } from '../middleware/auth.middleware.js'

const app = new Hono()

// Protect all routes with authentication
app.use('/*', webAuthMiddleware)

app.get('/proxy/images/:token', async (c) => {
  const imageToken = c.req.param('token')
  
  try {
    const tokenData = TokenService.verifyToken(imageToken)
    if (!tokenData) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const stream = await S3Service.getObject(tokenData.key)
    if (!stream) {
      return c.json({ error: 'Image not found' }, 404)
    }

    // Set appropriate headers for secure image delivery
    c.header('Cache-Control', 'no-store, must-revalidate, private')
    c.header('Pragma', 'no-cache')
    c.header('Expires', '0')
    c.header('Content-Type', 'image/jpeg')
    c.header('Cross-Origin-Resource-Policy', 'same-origin')
    c.header('Content-Security-Policy', "default-src 'self'")
    
    // Stream the image directly
    return new Response(stream)
  } catch (error) {
    console.error('Error streaming image:', error)
    return c.json({ error: 'Failed to fetch image' }, 500)
  }
})

export { app as proxyRoutes }