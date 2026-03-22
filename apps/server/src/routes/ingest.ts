import type { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { fanoutQueue } from '../queues/fanout.queue'
import { verifySignature } from '../lib/hmac'

export async function ingestRoutes(app: FastifyInstance) {
  app.post<{
    Params: { ingestKey: string }
  }>('/:ingestKey', async (request, reply) => {

    const { ingestKey } = request.params

    // 1. Look up the project by ingest key
    const project = await db.project.findUnique({
      where: { ingestKey },
    })

    // Unknown key — return 404 but don't leak details
    if (!project) {
      return reply.status(404).send({ error: 'Not found' })
    }

    // optional inbound signature verification
    // only runs if the project has a signingSecret configured
    // this is how you verify webhooks genuinely came from Stripe/GitHub
    if (project.signingSecret) {
      const signatureHeader =
        request.headers['x-hookpipe-signature'] as string ||
        request.headers['stripe-signature'] as string ||
        request.headers['x-hub-signature-256'] as string

      if (!signatureHeader) {
        return reply.status(401).send({ error: 'Missing signature header' })
      }

      const rawBody = JSON.stringify(request.body)
      const valid = verifySignature(rawBody, signatureHeader, project.signingSecret)

      if (!valid) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }
    }

    // 2. Save the raw event immediately — before anything else
    // If the queue fails after this, the event is still safe in the DB
    const event = await db.event.create({
      data: {
        projectId: project.id,
        payload: request.body as object ?? {},
        headers: request.headers as object,
        sourceIp: request.ip,
      },
    })

    // 3. Push a fan-out job to the queue — async, doesn't block response
    await fanoutQueue.add('fanout', {
      eventId: event.id,
      projectId: project.id,
    })

    // 4. Respond immediately — Stripe/GitHub/whoever sent this is happy
    // We respond BEFORE delivery happens — that's the whole point
    return reply.status(200).send({ received: true, eventId: event.id })
  })
}