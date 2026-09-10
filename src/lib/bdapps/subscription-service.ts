import { prisma } from '../db';
import { env } from '../env';
import { buildBdappsAuthorizationUrl, generateRequestId } from './signer';
import {
  BDAPPS_ERROR_CODES,
  BDAPPS_PLANS,
  BdappsPlanPeriod,
  InitiateBdappsSubscriptionParams,
  InitiateBdappsSubscriptionResult,
  HandleBdappsCallbackResult,
  HandleBdappsWebhookResult,
} from './types';
import { sendWhatsAppMessage } from '../whatsapp';

/**
 * Normalizes a Bangladeshi phone number into standard formats:
 * - rawNumber: e.g. "8801712345678" (for whatsappId)
 * - formatted: e.g. "+8801712345678" (for display/E.164)
 */
export function normalizeBdPhoneNumber(input: string): {
  raw: string;
  formatted: string;
} {
  const digits = input.replace(/\D/g, '');
  let raw = digits;

  if (raw.startsWith('880')) {
    // already starts with country code
  } else if (raw.startsWith('0')) {
    raw = '88' + raw;
  } else if (raw.length === 10) {
    raw = '880' + raw;
  }

  return {
    raw,
    formatted: `+${raw}`,
  };
}

/**
 * Initiates a bdApps bKash subscription flow:
 * 1. Resolves or creates user record
 * 2. Generates unique 15-char requestId
 * 3. Records a PENDING subscription & payment
 * 4. Generates signed bdApps authorization URL
 */
export async function initiateBdappsSubscription(
  params: InitiateBdappsSubscriptionParams
): Promise<InitiateBdappsSubscriptionResult> {
  const planPeriod = (params.planPeriod?.toLowerCase() === 'weekly' ? 'weekly' : 'monthly') as BdappsPlanPeriod;
  const plan = BDAPPS_PLANS[planPeriod];

  let user = null;

  if (params.userId) {
    user = await prisma.user.findUnique({
      where: { id: params.userId },
    });
  }

  if (!user && params.phoneNumber) {
    const { raw, formatted } = normalizeBdPhoneNumber(params.phoneNumber);
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { whatsappId: raw },
          { phoneNumber: formatted },
          { phoneNumber: raw },
        ],
      },
    });

    try {
      if (!user) {
        user = await prisma.user.create({
          data: {
            whatsappId: raw,
            phoneNumber: formatted,
            email: params.email || null,
            timezone: 'Asia/Dhaka',
            planTier: 'free',
          },
        });
      } else if (params.email && user.email !== params.email) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email: params.email },
        });
      }
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        return {
          success: false,
          error: 'This email address or phone number is already connected to another account.',
        };
      }
      throw dbError;
    }
  }

  if (!user) {
    return {
      success: false,
      error: 'User or valid phone number is required to initiate subscription.',
    };
  }

  // Prevent double-subscription
  if (user.planTier === 'pro') {
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    
    if (activeSub) {
      return {
        success: false,
        error: 'This WhatsApp number is already subscribed to Remique Pro.',
      };
    }
  }

  const requestId = generateRequestId();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // Upsert subscription in PENDING state
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planTier: 'pro',
      planPeriod: plan.period,
      amount: plan.amount,
      currency: plan.currency,
      status: 'PENDING',
      requestId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planTier: 'pro',
      planPeriod: plan.period,
      amount: plan.amount,
      currency: plan.currency,
      status: 'PENDING',
      requestId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Track payment attempt
  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: plan.amount,
      currency: plan.currency,
      provider: 'bdapps',
      externalId: requestId,
      status: 'PENDING',
      periodStart: now,
      periodEnd: periodEnd,
      subscriptionId: subscription.id,
    },
  });

  const appBaseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const baseRedirect = params.redirectUrl || `${appBaseUrl}/api/billing/bdapps/callback`;
  const redirectUrl = baseRedirect.includes('?') 
    ? `${baseRedirect}&requestId=${requestId}` 
    : `${baseRedirect}?requestId=${requestId}`;

  const { url } = buildBdappsAuthorizationUrl({
    redirectUrl,
    requestId,
  });

  return {
    success: true,
    authorizationUrl: url,
    requestId,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
    },
  };
}

/**
 * Handles browser return after bdApps authorization.
 * bdApps redirects back with status, requestId, subscriberId, errorCode, etc.
 */
export async function handleBdappsCallback(
  searchParams: URLSearchParams
): Promise<HandleBdappsCallbackResult> {
  console.log('[bdApps Callback] Received searchParams:', Object.fromEntries(searchParams.entries()));
  
  const appBaseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');

  const requestId = searchParams.get('requestId') || searchParams.get('reference') || undefined;
  const subscriberId = searchParams.get('subscriberId') || undefined;
  const status = searchParams.get('status')?.toUpperCase();
  const statusCode = searchParams.get('statusCode');
  const statusDetail = searchParams.get('statusDetail');
  const errorCode = searchParams.get('errorCode') || searchParams.get('error');

  // Check failure cases
  const isFailed =
    (errorCode && !['0', '0000', 'null', 'undefined', 'success'].includes(errorCode.toLowerCase())) ||
    status === 'CANCELLED' ||
    status === 'FAILED' ||
    status === 'DECLINED' ||
    statusCode === 'E1001';

  if (isFailed) {
    const errorMsg =
      (errorCode && BDAPPS_ERROR_CODES[errorCode]) ||
      statusDetail ||
      'Subscription was cancelled or could not be completed.';

    if (requestId) {
      // Mark payment as FAILED
      await prisma.payment
        .updateMany({
          where: { externalId: requestId, status: 'PENDING' },
          data: { status: 'FAILED' },
        })
        .catch(() => {});

      // If subscription was pending, update it
      await prisma.subscription
        .updateMany({
          where: { requestId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        })
        .catch(() => {});
    }

    return {
      success: false,
      requestId,
      subscriberId,
      error: errorMsg,
      errorCode: errorCode || undefined,
      redirectUrl: `${appBaseUrl}/billing/cancelled?error=${encodeURIComponent(errorMsg)}`,
    };
  }

  // Find subscription by requestId
  let subscription = null;
  if (requestId) {
    subscription = await prisma.subscription.findUnique({
      where: { requestId },
      include: { user: true },
    });
  }

  // Fallback find by subscriberId if available
  if (!subscription && subscriberId) {
    const cleanSub = subscriberId.replace(/^tel:/, '').replace(/\D/g, '');
    subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { subscriberId },
          { user: { whatsappId: cleanSub } },
          { user: { phoneNumber: `+${cleanSub}` } },
        ],
      },
      include: { user: true },
    });
  }

  if (!subscription) {
    return {
      success: false,
      requestId,
      subscriberId,
      error: 'No matching subscription request found.',
      redirectUrl: `${appBaseUrl}/billing/cancelled?error=${encodeURIComponent(
        'Subscription session not found. Please try again.'
      )}`,
    };
  }

  const user = subscription.user;
  const planPeriod = (subscription.planPeriod.toLowerCase() === 'weekly' ? 'weekly' : 'monthly') as BdappsPlanPeriod;
  const plan = BDAPPS_PLANS[planPeriod];
  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // Activate Subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      subscriberId: subscriberId || subscription.subscriberId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    },
  });

  // Activate User Pro plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier: 'pro',
      planPeriod: plan.period,
      planStartedAt: now,
      planExpiresAt: periodEnd,
    },
  });

  // Mark Payment as PAID
  if (requestId) {
    await prisma.payment
      .updateMany({
        where: { externalId: requestId },
        data: {
          status: 'PAID',
          subscriptionId: subscription.id,
        },
      })
      .catch(() => {});
  }

  // Notify user via WhatsApp
  try {
    const expiryDateStr = periodEnd.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    await sendWhatsAppMessage(
      user.phoneNumber,
      `Your second brain has been activated 🧠✨.\n\n` +
        `You're now on Remique Pro ${plan.label}. You can start chatting right away!`
    );
  } catch (notifyErr) {
    console.warn('[bdApps] Failed to send WhatsApp confirmation message:', notifyErr);
  }

  return {
    success: true,
    requestId,
    subscriberId,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
    },
    redirectUrl: `https://wa.me/8801895638339?text=Hi`,
  };
}

/**
 * Handles asynchronous IPN notifications (webhooks) from bdApps.
 */
export async function handleBdappsWebhook(
  payload: any
): Promise<HandleBdappsWebhookResult> {
  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      status: 'UNKNOWN',
      actionTaken: 'ERROR',
      error: 'Invalid webhook payload structure',
    };
  }

  const rawStatus = (payload.status || '').toUpperCase();
  const requestId = payload.requestId || undefined;
  const rawSubscriberId = payload.subscriberId || undefined;
  const subscriberDigits = rawSubscriberId
    ? rawSubscriberId.replace(/^tel:/, '').replace(/\D/g, '')
    : undefined;

  // Find existing subscription
  let subscription = null;
  if (requestId) {
    subscription = await prisma.subscription.findUnique({
      where: { requestId },
      include: { user: true },
    });
  }

  if (!subscription && subscriberDigits) {
    subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { subscriberId: rawSubscriberId },
          { user: { whatsappId: subscriberDigits } },
          { user: { phoneNumber: `+${subscriberDigits}` } },
        ],
      },
      include: { user: true },
    });
  }

  if (rawStatus === 'REGISTERED') {
    if (!subscription && subscriberDigits) {
      // If user exists, create active subscription
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { whatsappId: subscriberDigits },
            { phoneNumber: `+${subscriberDigits}` },
          ],
        },
      });

      if (user) {
        const plan = BDAPPS_PLANS.monthly;
        const now = new Date();
        const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        subscription = await prisma.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            planTier: 'pro',
            planPeriod: plan.period,
            amount: plan.amount,
            currency: plan.currency,
            status: 'ACTIVE',
            requestId: requestId || generateRequestId(),
            subscriberId: rawSubscriberId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          update: {
            status: 'ACTIVE',
            subscriberId: rawSubscriberId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          include: { user: true },
        });
      }
    }

    if (subscription) {
      const planPeriod = (subscription.planPeriod.toLowerCase() === 'weekly' ? 'weekly' : 'monthly') as BdappsPlanPeriod;
      const plan = BDAPPS_PLANS[planPeriod];
      const now = new Date();
      const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          subscriberId: rawSubscriberId || subscription.subscriberId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
      });

      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          planTier: 'pro',
          planPeriod: plan.period,
          planStartedAt: now,
          planExpiresAt: periodEnd,
        },
      });

      // Record renewal or active payment
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          amount: plan.amount,
          currency: plan.currency,
          provider: 'bdapps',
          externalId: requestId ? `${requestId}_renew_${Date.now()}` : undefined,
          status: 'PAID',
          periodStart: now,
          periodEnd: periodEnd,
          subscriptionId: subscription.id,
        },
      });

      return {
        success: true,
        status: rawStatus,
        subscriberId: rawSubscriberId,
        requestId,
        actionTaken: 'ACTIVATED',
      };
    }

    return {
      success: true,
      status: rawStatus,
      subscriberId: rawSubscriberId,
      requestId,
      actionTaken: 'IGNORED',
    };
  }

  if (rawStatus === 'UNREGISTERED') {
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          planTier: 'free',
        },
      });

      return {
        success: true,
        status: rawStatus,
        subscriberId: rawSubscriberId,
        requestId,
        actionTaken: 'CANCELLED',
      };
    }
  }

  return {
    success: true,
    status: rawStatus,
    subscriberId: rawSubscriberId,
    requestId,
    actionTaken: 'IGNORED',
  };
}

/**
 * Cancels a user's subscription in Remique.
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    return { success: false, error: 'No active subscription found.' };
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: 'free',
    },
  });

  return { success: true };
}
