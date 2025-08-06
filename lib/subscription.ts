import { eq, and, or } from 'drizzle-orm';
import { subscription, payment, organizationMember } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import {
  subscriptionCache,
  createSubscriptionKey,
  getProUserStatus,
  setProUserStatus,
  getDodoPayments,
  setDodoPayments,
  getDodoPaymentExpiration,
  setDodoPaymentExpiration,
  getDodoProStatus,
  setDodoProStatus,
} from './performance-cache';

const DODO_SUBSCRIPTION_DURATION_MONTHS = parseInt(process.env.DODO_SUBSCRIPTION_DURATION_MONTHS || '1');

export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
  seats?: number;
  pricePerSeat?: number;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

async function checkDodoPaymentsProStatus(userId: string): Promise<boolean> {
  try {
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      return cachedStatus.isProUser;
    }

    let userPayments = getDodoPayments(userId);
    if (!userPayments) {
      userPayments = await db.select().from(payment).where(eq(payment.userId, userId));
      setDodoPayments(userId, userPayments);
    }

    const successfulPayments = userPayments
      .filter((p: any) => p.status === 'succeeded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (successfulPayments.length === 0) {
      const statusData = { isProUser: false, hasPayments: false };
      setDodoProStatus(userId, statusData);
      console.log('No successful payments found');
      return false;
    }

    const mostRecentPayment = successfulPayments[0];
    const paymentDate = new Date(mostRecentPayment.createdAt);
    const subscriptionEndDate = new Date(paymentDate);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);

    const now = new Date();
    const isActive = subscriptionEndDate > now;

    const statusData = {
      isProUser: isActive,
      hasPayments: true,
      mostRecentPayment: mostRecentPayment.createdAt,
      subscriptionEndDate: subscriptionEndDate.toISOString(),
    };
    setDodoProStatus(userId, statusData);

    return isActive;
  } catch (error) {
    console.error('Error checking DodoPayments status:', error);
    return false;
  }
}

async function getComprehensiveProStatus(
  userId: string,
  organizationId?: string | null,
): Promise<{ isProUser: boolean; source: 'polar' | 'dodo' | 'organization' | 'none' }> {
  try {
    if (organizationId) {
      const orgSubscriptions = await db
        .select()
        .from(subscription)
        .where(and(eq(subscription.organizationId, organizationId), eq(subscription.status, 'active')));

      if (orgSubscriptions.length > 0) {
        console.log('🔥 Organization subscription found for user:', userId);
        return { isProUser: true, source: 'organization' };
      }
    }

    const userSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, userId));
    const activeSubscription = userSubscriptions.find((sub) => sub.status === 'active');

    if (activeSubscription) {
      console.log('🔥 Polar subscription found for user:', userId);
      return { isProUser: true, source: 'polar' };
    }

    const hasDodoProStatus = await checkDodoPaymentsProStatus(userId);

    if (hasDodoProStatus) {
      console.log('🔥 DodoPayments subscription found for user:', userId);
      return { isProUser: true, source: 'dodo' };
    }

    return { isProUser: false, source: 'none' };
  } catch (error) {
    console.error('Error getting comprehensive pro status:', error);
    return { isProUser: false, source: 'none' };
  }
}

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    const cacheKey = createSubscriptionKey(session.user.id);
    const cached = subscriptionCache.get(cacheKey);
    if (cached) {
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return cached;
    }

    const userSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, session.user.id));

    if (!userSubscriptions.length) {
      const proStatus = await getComprehensiveProStatus(session.user.id);
      const result = { hasSubscription: false };
      subscriptionCache.set(cacheKey, result);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return result;
    }

    const activeSubscription = userSubscriptions
      .filter((sub) => sub.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!activeSubscription) {
      const latestSubscription = userSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = new Date(latestSubscription.currentPeriodEnd) < now;
        const isCanceled = latestSubscription.status === 'canceled';

        const result = {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId,
            status: latestSubscription.status,
            amount: latestSubscription.amount,
            currency: latestSubscription.currency,
            recurringInterval: latestSubscription.recurringInterval,
            currentPeriodStart: latestSubscription.currentPeriodStart,
            currentPeriodEnd: latestSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt,
            organizationId: null,
          },
          error: isCanceled
            ? 'Subscription has been canceled'
            : isExpired
              ? 'Subscription has expired'
              : 'Subscription is not active',
          errorType: (isCanceled ? 'CANCELED' : isExpired ? 'EXPIRED' : 'GENERAL') as
            | 'CANCELED'
            | 'EXPIRED'
            | 'GENERAL',
        };
        subscriptionCache.set(cacheKey, result);
        const proStatus = await getComprehensiveProStatus(session.user.id);
        setProUserStatus(session.user.id, proStatus.isProUser);
        return result;
      }

      const fallbackResult = { hasSubscription: false };
      subscriptionCache.set(cacheKey, fallbackResult);
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return fallbackResult;
    }

    const result = {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        recurringInterval: activeSubscription.recurringInterval,
        currentPeriodStart: activeSubscription.currentPeriodStart,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt,
        organizationId: null,
      },
    };
    subscriptionCache.set(cacheKey, result);
    setProUserStatus(session.user.id, true);
    return result;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return {
      hasSubscription: false,
      error: 'Failed to load subscription details',
      errorType: 'GENERAL',
    };
  }
}

export async function isUserSubscribed(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return false;
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);
    return proStatus.isProUser;
  } catch (error) {
    console.error('Error checking user subscription status:', error);
    return false;
  }
}

export async function isUserProCached(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return false;
  }

  const cached = getProUserStatus(session.user.id);
  if (cached !== null) {
    return cached;
  }

  const proStatus = await getComprehensiveProStatus(session.user.id);
  setProUserStatus(session.user.id, proStatus.isProUser);
  return proStatus.isProUser;
}

export async function hasAccessToProduct(productId: string): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return (
    result.hasSubscription && result.subscription?.status === 'active' && result.subscription?.productId === productId
  );
}

export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return 'none';
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);

    if (proStatus.isProUser) {
      if (proStatus.source === 'dodo') {
        return 'active';
      }
    }

    const result = await getSubscriptionDetails();

    if (!result.hasSubscription) {
      return proStatus.isProUser ? 'active' : 'none';
    }

    if (result.subscription?.status === 'active') {
      return 'active';
    }

    if (result.errorType === 'CANCELED') {
      return 'canceled';
    }

    if (result.errorType === 'EXPIRED') {
      return 'expired';
    }

    return 'none';
  } catch (error) {
    console.error('Error getting user subscription status:', error);
    return 'none';
  }
}

export async function getDodoPaymentsExpirationDate(): Promise<Date | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const cachedExpiration = getDodoPaymentExpiration(session.user.id);
    if (cachedExpiration !== null) {
      return cachedExpiration.expirationDate ? new Date(cachedExpiration.expirationDate) : null;
    }

    let userPayments = getDodoPayments(session.user.id);
    if (!userPayments) {
      userPayments = await db.select().from(payment).where(eq(payment.userId, session.user.id));
      setDodoPayments(session.user.id, userPayments);
    }

    const successfulPayments = userPayments
      .filter((p: any) => p.status === 'succeeded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (successfulPayments.length === 0) {
      const expirationData = { expirationDate: null };
      setDodoPaymentExpiration(session.user.id, expirationData);
      return null;
    }

    const mostRecentPayment = successfulPayments[0];
    const expirationDate = new Date(mostRecentPayment.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);

    const expirationData = {
      expirationDate: expirationDate.toISOString(),
      paymentDate: mostRecentPayment.createdAt,
    };
    setDodoPaymentExpiration(session.user.id, expirationData);

    return expirationDate;
  } catch (error) {
    console.error('Error getting DodoPayments expiration date:', error);
    return null;
  }
}

export async function getProStatusWithSource(): Promise<{
  isProUser: boolean;
  source: 'polar' | 'dodo' | 'organization' | 'none';
  expiresAt?: Date;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { isProUser: false, source: 'none' };
    }

    const userOrganizationId = await getUserActiveOrganizationId(session.user.id);
    const proStatus = await getComprehensiveProStatus(session.user.id, userOrganizationId);

    if (proStatus.source === 'dodo' && proStatus.isProUser) {
      const expiresAt = await getDodoPaymentsExpirationDate();
      return { ...proStatus, expiresAt: expiresAt || undefined };
    }

    return proStatus;
  } catch (error) {
    console.error('Error getting pro status with source:', error);
    return { isProUser: false, source: 'none' };
  }
}

async function getUserActiveOrganizationId(userId: string): Promise<string | null> {
  try {
    const memberships = await db.select().from(organizationMember).where(eq(organizationMember.userId, userId));

    if (memberships.length === 0) {
      return null;
    }

    return memberships[0].organizationId;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

export async function getOrganizationSubscriptionDetails(organizationId: string): Promise<SubscriptionDetailsResult> {
  try {
    const orgSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.organizationId, organizationId));

    if (!orgSubscriptions.length) {
      return { hasSubscription: false };
    }

    const activeSubscription = orgSubscriptions
      .filter((sub) => sub.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!activeSubscription) {
      const latestSubscription = orgSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = new Date(latestSubscription.currentPeriodEnd) < now;
        const isCanceled = latestSubscription.status === 'canceled';

        return {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId,
            status: latestSubscription.status,
            amount: latestSubscription.amount,
            currency: latestSubscription.currency,
            recurringInterval: latestSubscription.recurringInterval,
            currentPeriodStart: latestSubscription.currentPeriodStart,
            currentPeriodEnd: latestSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt,
            organizationId: latestSubscription.organizationId,
            seats: latestSubscription.seats || 1,
            pricePerSeat: latestSubscription.pricePerSeat || undefined,
          },
          error: isCanceled
            ? 'Subscription has been canceled'
            : isExpired
              ? 'Subscription has expired'
              : 'Subscription is not active',
          errorType: (isCanceled ? 'CANCELED' : isExpired ? 'EXPIRED' : 'GENERAL') as
            | 'CANCELED'
            | 'EXPIRED'
            | 'GENERAL',
        };
      }

      return { hasSubscription: false };
    }

    return {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        recurringInterval: activeSubscription.recurringInterval,
        currentPeriodStart: activeSubscription.currentPeriodStart,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt,
        organizationId: activeSubscription.organizationId,
        seats: activeSubscription.seats || 1,
        pricePerSeat: activeSubscription.pricePerSeat || undefined,
      },
    };
  } catch (error) {
    console.error('Error fetching organization subscription:', error);
    return {
      hasSubscription: false,
      error: 'Failed to load subscription details',
      errorType: 'GENERAL',
    };
  }
}

export async function getOrganizationMemberCount(organizationId: string): Promise<number> {
  try {
    const members = await db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.organizationId, organizationId));

    return members.length;
  } catch (error) {
    console.error('Error getting organization member count:', error);
    return 0;
  }
}

export async function checkOrganizationSeatAvailability(organizationId: string): Promise<{
  hasAvailableSeats: boolean;
  usedSeats: number;
  totalSeats: number;
}> {
  try {
    const subscriptionDetails = await getOrganizationSubscriptionDetails(organizationId);
    const memberCount = await getOrganizationMemberCount(organizationId);

    if (!subscriptionDetails.hasSubscription || !subscriptionDetails.subscription) {
      return {
        hasAvailableSeats: false,
        usedSeats: memberCount,
        totalSeats: 0,
      };
    }

    const totalSeats = subscriptionDetails.subscription.seats || 1;

    return {
      hasAvailableSeats: memberCount < totalSeats,
      usedSeats: memberCount,
      totalSeats,
    };
  } catch (error) {
    console.error('Error checking organization seat availability:', error);
    return {
      hasAvailableSeats: false,
      usedSeats: 0,
      totalSeats: 0,
    };
  }
}
