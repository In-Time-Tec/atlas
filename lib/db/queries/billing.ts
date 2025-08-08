import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { payment } from '@/lib/db/schema';
import { getDodoPayments, setDodoPayments, getDodoProStatus, setDodoProStatus } from '@/lib/performance-cache';

export async function getPaymentsByUserId({ userId }: { userId: string }) {
  try {
    const cachedPayments = getDodoPayments(userId);
    if (cachedPayments) {
      return cachedPayments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const payments = await db.select().from(payment).where(eq(payment.userId, userId)).orderBy(desc(payment.createdAt));
    setDodoPayments(userId, payments);
    return payments;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payments by user id');
  }
}

export async function getPaymentById({ paymentId }: { paymentId: string }) {
  try {
    const [selectedPayment] = await db.select().from(payment).where(eq(payment.id, paymentId));
    return selectedPayment;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payment by id');
  }
}

export async function getSuccessfulPaymentsByUserId({ userId }: { userId: string }) {
  try {
    return await db.select().from(payment).where(and(eq(payment.userId, userId), eq(payment.status, 'succeeded'))).orderBy(desc(payment.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get successful payments by user id');
  }
}

export async function getTotalPaymentAmountByUserId({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    return payments.reduce((total, p: any) => total + (p.totalAmount || 0), 0);
  } catch (error) {
    console.error('Error getting total payment amount:', error);
    return 0;
  }
}

export async function hasSuccessfulDodoPayment({ userId }: { userId: string }) {
  try {
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      return cachedStatus.hasPayments || false;
    }
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    const hasPayments = payments.length > 0;
    const statusData = { hasPayments, isProUser: false };
    setDodoProStatus(userId, statusData);
    return hasPayments;
  } catch (error) {
    console.error('Error checking DodoPayments status:', error);
    return false;
  }
}

export async function isDodoPaymentsProExpired({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    if (payments.length === 0) return true;
    const mostRecentPayment = payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const paymentDate = new Date(mostRecentPayment.createdAt);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return paymentDate <= oneMonthAgo;
  } catch (error) {
    console.error('Error checking DodoPayments expiration:', error);
    return true;
  }
}

export async function getDodoPaymentsExpirationInfo({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    if (payments.length === 0) return null;
    const mostRecentPayment = payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const expirationDate = new Date(mostRecentPayment.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + 1);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { paymentDate: mostRecentPayment.createdAt, expirationDate, daysUntilExpiration, isExpired: daysUntilExpiration <= 0, isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0 };
  } catch (error) {
    console.error('Error getting DodoPayments expiration info:', error);
    return null;
  }
}


