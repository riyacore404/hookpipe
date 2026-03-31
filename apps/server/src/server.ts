import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { ingestRoutes } from './routes/ingest.js'
import { projectRoutes } from './routes/projects.js'
import { eventRoutes } from './routes/events.js'
import { destinationRoutes } from './routes/destinations.js'
import { deliveryRoutes } from './routes/deliveries.js'
import { filterRuleRoutes } from './routes/filterrules.js'
import { apiKeyRoutes } from './routes/apikeys.js'
import { organisationRoutes } from './routes/organisations.js'
import { healthRoutes } from './routes/health.js'
import { analyticsRoutes } from './routes/analytics.js'
import { alertRuleRoutes } from './routes/alertrules.js'

const app = Fastify({
  logger: false, // we use pino directly
})

// security middleware
await app.register(helmet)

// requests from Next.js
await app.register(cors, {
  origin: env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : (process.env.FRONTEND_URL ?? 'http://localhost:3000'),
  credentials: true,
})

// Public routes — no auth
await app.register(ingestRoutes, { prefix: '/ingest' })
 
// Authenticated routes
await app.register(projectRoutes, { prefix: '/api/projects' })
await app.register(eventRoutes, { prefix: '/api/events' })
await app.register(destinationRoutes, { prefix: '/api/destinations' })
await app.register(deliveryRoutes, { prefix: '/api/deliveries' })
await app.register(filterRuleRoutes, { prefix: '/api/filter-rules' })
await app.register(apiKeyRoutes, { prefix: '/api/api-keys' })
await app.register(organisationRoutes, { prefix: '/api/organisations' })
await app.register(healthRoutes, { prefix: '/health' })
await app.register(analyticsRoutes, { prefix: '/api/analytics' })
await app.register(alertRuleRoutes, { prefix: '/api/alert-rules' })

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  logger.info({ port: env.PORT }, 'Server started')
} catch (err) {
  logger.error(err, 'Server failed to start')
  process.exit(1)
}