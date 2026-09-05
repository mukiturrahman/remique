import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  // Overridable so a faster or stronger model can be swapped in from the
  // dashboard without a redeploy. Parse latency is the single largest item in
  // the reply budget, and Banglish accuracy is the reason to escalate.
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),
  // Upstash pins accounts to a region. Without this the SDK talks to the global
  // endpoint, which rejects requests for a region-scoped account.
  QSTASH_URL: z.string().url().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  // Gates the expensive /api/health checks. Without it the deep probe is
  // disabled in production rather than left open to anonymous traffic.
  HEALTH_CHECK_SECRET: z.string().optional(),
  SQS_QUEUE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Validates all env vars at startup — throws with a clear message if anything is missing.
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('[Remique] ❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  // In production, throw so the deployment fails loudly rather than silently degrading.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing or invalid environment variables. Check Vercel env config.');
  }
}

export const env: Env = _parsed.success
  ? _parsed.data
  : {
      // Fallback for local dev when some vars are missing (won't crash dev server)
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      DATABASE_URL: process.env.DATABASE_URL || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
      QSTASH_TOKEN: process.env.QSTASH_TOKEN || '',
      QSTASH_URL: process.env.QSTASH_URL,
      QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
      QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
      HEALTH_CHECK_SECRET: process.env.HEALTH_CHECK_SECRET,
      SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,
    };
