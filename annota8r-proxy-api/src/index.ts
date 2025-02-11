// src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors.js'
import { routes } from './routes/index.js'
import { env } from './config/env.js'

const app = new Hono()

// Add CORS middleware
app.use('/*', corsMiddleware)

// Add routes
app.route('/', routes)

// Log configuration
console.log('Configuration:')
console.log(`- PORT: ${env.PORT}`)
console.log(`- AWS_REGION: ${env.AWS_REGION}`)
console.log(`- S3_BUCKET_NAME: ${env.S3_BUCKET_NAME}`)
console.log('- AWS credentials are configured')

// Start the server
console.log(`Server is running on port ${env.PORT}`)

serve({
  fetch: app.fetch,
  port: env.PORT
})