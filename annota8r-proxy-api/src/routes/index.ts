// src/routes/index.ts
import { Hono } from 'hono'
import { authRoutes } from './auth.routes.js'
import { projectRoutes } from './project.routes.js'
import { imageRoutes } from './image.routes.js'
import { annotationRoutes } from './annotation.routes.js'
import { logRoutes } from './log.routes.js'
import { userRoutes } from './user.routes.js'
import { adminRoutes } from './admin.routes.js'

const app = new Hono()

// API version prefix for all routes
const API_PREFIX = '/api/v1'

// Mount all route groups under the API prefix
app.route(`${API_PREFIX}/auth`, authRoutes)
app.route(`${API_PREFIX}/users`, userRoutes)
app.route(`${API_PREFIX}/admins`, adminRoutes)
app.route(`${API_PREFIX}/projects`, projectRoutes)
app.route(`${API_PREFIX}/images`, imageRoutes)
app.route(`${API_PREFIX}/logs`, logRoutes)

// Routes that don't fit the pattern above
app.route(API_PREFIX, annotationRoutes) // These routes include project-related annotation paths

export { app as routes }