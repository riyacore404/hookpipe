import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { db } from '../src/db/client.js'
import { apiKeyRoutes } from '../src/routes/apikeys.js'
import { randomBytes, createHash } from 'crypto'

const TEST_USER_ID = 'test-user-auth-123'
const TEST_USER_ID_2 = 'test-user-auth-456'

describe('API key auth', () => {
  let app: ReturnType<typeof Fastify>
  let validApiKey: string

  beforeAll(async () => {
    // Create the user first so the FK constraint is satisfied
    await db.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'test-auth@hookpipe.test',
        passwordHash: 'not-a-real-hash',
      },
    })

    const rawKey = `hp_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    validApiKey = rawKey

    await db.apiKey.create({
      data: {
        userId: TEST_USER_ID,
        keyHash,
        label: 'test key',
      },
    })

    app = Fastify()
    await app.register(apiKeyRoutes, { prefix: '/api/api-keys' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await db.apiKey.deleteMany({ where: { userId: TEST_USER_ID } })
    await db.user.deleteMany({ where: { id: TEST_USER_ID } })
  })

  it('rejects request with no auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/api-keys',
    })
    expect(res.statusCode).toBe(401)
  })

  it('accepts request with valid API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/api-keys',
      headers: { 'x-api-key': validApiKey },
    })
    expect(res.statusCode).toBe(200)
  })

  it('rejects revoked API key', async () => {
    // revoke the key
    const keyHash = createHash('sha256').update(validApiKey).digest('hex')
    await db.apiKey.updateMany({
      where: { keyHash },
      data: { revokedAt: new Date() },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/api-keys',
      headers: { 'x-api-key': validApiKey },
    })
    expect(res.statusCode).toBe(401)
  })
})