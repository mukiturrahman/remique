import { Client } from '@upstash/qstash';
import { env } from './env';

let qstashInstance: Client | null = null;

export function getQStashClient(): Client {
  if (!qstashInstance) {
    qstashInstance = new Client({
      token: env.QSTASH_TOKEN,
    });
  }
  return qstashInstance;
}

export async function scheduleDelayedReminder(
  reminderId: string,
  scheduledAtUtc: Date,
  appUrl: string = env.NEXT_PUBLIC_APP_URL
): Promise<string> {
  // Guard: never schedule a QStash callback to localhost — it will always fail.
  const isLocalhost =
    appUrl.includes('localhost') ||
    appUrl.includes('127.0.0.1') ||
    appUrl.includes('::1');

  if (isLocalhost) {
    throw new Error(
      `[Remique] QStash cannot deliver to a loopback address: "${appUrl}". ` +
        'Set NEXT_PUBLIC_APP_URL to your live Vercel deployment URL.'
    );
  }

  const notBeforeUnix = Math.floor(scheduledAtUtc.getTime() / 1000);
  const targetUrl = `${appUrl.replace(/\/$/, '')}/api/jobs/send-reminder`;
  const client = getQStashClient();

  const response = await client.publishJSON({
    url: targetUrl,
    body: { reminderId },
    notBefore: notBeforeUnix,
    deduplicationId: `remique_${reminderId}`,
  });

  return response.messageId;
}
