import { fanoutWorker } from './workers/fanout.worker'
import { deliveryWorker } from './workers/delivery.worker'

console.log('Workers started')
console.log('Fanout worker listening...')
console.log('Delivery worker listening...')

// Graceful shutdown — finish current jobs before stopping
async function shutdown() {
  console.log('Shutting down workers...')
  await fanoutWorker.close()
  await deliveryWorker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)