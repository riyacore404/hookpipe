import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './config/env'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
})

// security middleware
await app.register(helmet)

// requests from Next.js
await app.register(cors, {
  origin: env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.FRONTEND_URL,
})

// health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`Server running on port ${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}