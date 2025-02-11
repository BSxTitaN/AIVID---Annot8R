import { Hono } from 'hono'
import { projectRoutes } from './project.routes.js'
import { imageRoutes } from './image.routes.js'
import { proxyRoutes } from './proxy.routes.js'
import { annotationRoutes } from './annotation.routes.js'
import { logRoutes } from './log.routes.js'
import { authRoutes } from './auth.routes.js'

const app = new Hono()

app.route('/api', authRoutes)

app.route('/api', projectRoutes)
app.route('/api', imageRoutes)
app.route('/api', proxyRoutes)
app.route('/api', annotationRoutes)
app.route('/api', logRoutes)

export { app as routes }