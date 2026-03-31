import { z } from 'zod'
import "dotenv/config";

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth (Clerk — P4)
  CLERK_SECRET_KEY: z.string().min(1),

  // Phase 5 additions
  // SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  
  ALERT_EVAL_INTERVAL_MS: z.coerce.number().default(60_000),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1) // hard stop — don't start with bad config
}

export const env = parsed.data