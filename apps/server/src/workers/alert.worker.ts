import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { getFailureRate, getDeadLetterCount, fireAlert } from '../services/alert.service.js'

let running = false

// evaluates all active alert rules — called on interval, not via BullMQ
// (BullMQ is overkill for a simple 60s polling loop; a setInterval is correct here)
export async function runAlertEvaluation(): Promise<void> {
  if (running) return // prevent overlap if a previous run is slow
  running = true

  try {
    const rules = await db.alertRule.findMany({
      where: { isActive: true },
      include: { destination: true },
    })

    for (const rule of rules) {
      try {
        let currentValue = 0

        if (rule.metric === 'failure_rate') {
          currentValue = await getFailureRate(rule.destinationId, rule.windowMinutes)
        } else if (rule.metric === 'dead_letter_count') {
          currentValue = await getDeadLetterCount(rule.destinationId, rule.windowMinutes)
        }

        const breached =
          rule.operator === 'gt'
            ? currentValue > rule.threshold
            : currentValue < rule.threshold

        if (!breached) continue

        // cooldown: don't re-fire within the same window
        const cooldownMs = rule.windowMinutes * 60 * 1000
        if (
          rule.lastFiredAt &&
          Date.now() - rule.lastFiredAt.getTime() < cooldownMs
        ) {
          continue
        }

        await fireAlert(rule, {
          destinationId: rule.destinationId,
          destinationUrl: rule.destination.url,
          metric: rule.metric,
          currentValue,
          threshold: rule.threshold,
          windowMinutes: rule.windowMinutes,
        })

        // update lastFiredAt to enforce cooldown
        await db.alertRule.update({
          where: { id: rule.id },
          data: { lastFiredAt: new Date() },
        })

        console.log(
          `[alert] fired rule ${rule.id} — ${rule.metric} = ${currentValue.toFixed(1)} > ${rule.threshold}`
        )
      } catch (err) {
        console.error(`[alert] error evaluating rule ${rule.id}:`, err instanceof Error ? err.message : err)
      }
    }
  } finally {
    running = false
  }
}

// start the polling loop
export function startAlertWorker(): NodeJS.Timeout {
  console.log(`[alert] worker started — evaluating every ${env.ALERT_EVAL_INTERVAL_MS / 1000}s`)
  return setInterval(runAlertEvaluation, env.ALERT_EVAL_INTERVAL_MS)
}