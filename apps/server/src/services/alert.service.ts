import { db } from '../db/client.js'
import { env } from '../config/env.js'

type AlertContext = {
  destinationId: string
  destinationUrl: string
  metric: string
  currentValue: number
  threshold: number
  windowMinutes: number
}

// evaluate failure rate for a destination over the last N minutes
export async function getFailureRate(
  destinationId: string,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)

  const [total, failed] = await Promise.all([
    db.deliveryAttempt.count({
      where: { destinationId, attemptedAt: { gte: since } },
    }),
    db.deliveryAttempt.count({
      where: { destinationId, status: 'failed', attemptedAt: { gte: since } },
    }),
  ])

  if (total === 0) return 0
  return (failed / total) * 100
}

// count dead letter attempts for a destination
export async function getDeadLetterCount(
  destinationId: string,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)
  return db.deliveryAttempt.count({
    where: { destinationId, status: 'dead', attemptedAt: { gte: since } },
  })
}

// send alert to configured channel
export async function fireAlert(
  rule: { channel: string; channelTarget: string; metric: string; threshold: number },
  context: AlertContext
): Promise<void> {
  const message = buildAlertMessage(context)

  if (rule.channel === 'slack') {
    await sendSlackAlert(rule.channelTarget, message)
  } else if (rule.channel === 'email') {
    // email stub — wire up SendGrid/Resend in a future iteration
    console.log(`[alert] EMAIL to ${rule.channelTarget}: ${message}`)
  }
}

function buildAlertMessage(ctx: AlertContext): string {
  return (
    `🚨 *Hookpipe Alert*\n` +
    `Destination: ${ctx.destinationUrl}\n` +
    `Metric: ${ctx.metric} = ${ctx.currentValue.toFixed(1)}` +
    ` (threshold: ${ctx.threshold})\n` +
    `Window: last ${ctx.windowMinutes} minutes`
  )
}

async function sendSlackAlert(webhookUrl: string, text: string): Promise<void> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error(`[alert] Slack delivery failed: ${res.status}`)
    }
  } catch (err) {
    console.error(`[alert] Slack error:`, err instanceof Error ? err.message : err)
  }
}