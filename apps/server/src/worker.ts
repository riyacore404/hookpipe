import { fanoutWorker } from './workers/fanout.worker'
import { deliveryWorker } from './workers/delivery.worker'
import { startAlertWorker } from './workers/alert.worker.js'

console.log('Workers started')
console.log('Fanout worker listening...')
console.log('Delivery worker listening...')

const alertTimer = startAlertWorker()

// Graceful shutdown — finish current jobs before stopping
async function shutdown() {
  console.log('Shutting down workers...')
  clearInterval(alertTimer) 
  await fanoutWorker.close()
  await deliveryWorker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)