import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { organization as organizationPlugin } from 'better-auth/plugins';
import {
  user,
  session,
  verification,
  account,
  chat,
  message,
  extremeSearchUsage,
  messageUsage,
  subscription,
  payment,
  customInstructions,
  stream,
  tasks,
  organization,
  organizationMember,
  organizationInvitation,
  userOrganizationSession,
} from '@/lib/db/schema';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import { config } from 'dotenv';
import { serverEnv } from '@/env/server';
import { checkout, polar, portal, usage, webhooks } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import {
  dodopayments,
  checkout as dodocheckout,
  portal as dodoportal,
  webhooks as dodowebhooks,
} from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { eq } from 'drizzle-orm';
import { invalidateUserCaches } from './performance-cache';

config({
  path: '.env.local',
});

function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  ...(process.env.NODE_ENV === 'production' ? {} : { server: 'sandbox' }),
});

export const dodoPayments = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  ...(process.env.NODE_ENV === 'production' ? { environment: 'live_mode' } : { environment: 'test_mode' }),
});

export const auth = betterAuth({
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      verification,
      account,
      chat,
      message,
      extremeSearchUsage,
      messageUsage,
      subscription,
      payment,
      customInstructions,
      stream,
      tasks,
      organization,
      organizationMember,
      organizationInvitation,
      userOrganizationSession,
    },
  }),
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
    twitter: {
      clientId: serverEnv.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.TWITTER_CLIENT_SECRET,
    },
  },
  pluginRoutes: {
    autoNamespace: true,
  },
  plugins: [
    organizationPlugin({
      allowUserToCreateOrganization: true,
      allowUserToLeaveOrganization: true,
      organizationLimit: 10,
      memberLimit: 100,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      creatorRole: 'owner',
      membershipLimit: 100,
      schema: {
        organization: {
          modelName: 'organization',
        },
        member: {
          modelName: 'organizationMember',
        },
        invitation: {
          modelName: 'organizationInvitation',
        },
      },
      sendInvitationEmail: async (data, request) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || serverEnv.APP_URL || 'http://localhost:3000';
        const invitationUrl = `${baseUrl}/organization/accept-invitation?id=${data.invitation.id}`;
        const inviterName = data.inviter.user.name || data.inviter.user.email;

        console.log('📧 Organization invitation email would be sent to:', data.email);
        console.log('🏢 Organization:', data.organization.name);
        console.log('🔗 Invitation ID:', data.invitation.id);
        console.log('📝 Invitation role:', data.role);
        console.log('👤 Invited by:', inviterName);
        console.log('🔗 Invitation URL:', invitationUrl);

        return Promise.resolve();
      },
    }),
    dodopayments({
      client: dodoPayments,
      createCustomerOnSignUp: true,
      use: [
        dodocheckout({
          products: [
            {
              productId:
                process.env.NEXT_PUBLIC_PREMIUM_TIER ||
                (() => {
                  throw new Error('NEXT_PUBLIC_PREMIUM_TIER environment variable is required');
                })(),
              slug:
                process.env.NEXT_PUBLIC_PREMIUM_SLUG ||
                (() => {
                  throw new Error('NEXT_PUBLIC_PREMIUM_SLUG environment variable is required');
                })(),
            },
          ],
          successUrl: '/success',
          authenticatedUsersOnly: true,
        }),
        dodoportal(),
        dodowebhooks({
          webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
          onPayload: async (payload) => {
            console.log('🔔 Received Dodo Payments webhook:', payload.type);
            console.log('📦 Payload data:', JSON.stringify(payload.data, null, 2));

            if (
              payload.type === 'payment.succeeded' ||
              payload.type === 'payment.failed' ||
              payload.type === 'payment.cancelled' ||
              payload.type === 'payment.processing'
            ) {
              console.log('🎯 Processing payment webhook:', payload.type);

              try {
                const data = payload.data;

                let validUserId = null;
                if (data.customer?.email) {
                  try {
                    const userExists = await db.query.user.findFirst({
                      where: eq(user.email, data.customer.email),
                      columns: { id: true },
                    });
                    validUserId = userExists ? userExists.id : null;

                    if (!userExists) {
                      console.warn(
                        `⚠️ User with email ${data.customer.email} not found, creating payment without user link`,
                      );
                    }
                  } catch (error) {
                    console.error('Error checking user existence:', error);
                  }
                }

                const paymentData = {
                  id: data.payment_id,
                  createdAt: new Date(data.created_at),
                  updatedAt: data.updated_at ? new Date(data.updated_at) : null,
                  brandId: data.brand_id || null,
                  businessId: data.business_id || null,
                  cardIssuingCountry: data.card_issuing_country || null,
                  cardLastFour: data.card_last_four || null,
                  cardNetwork: data.card_network || null,
                  cardType: data.card_type || null,
                  currency: data.currency,
                  digitalProductsDelivered: data.digital_products_delivered || false,
                  discountId: data.discount_id || null,
                  errorCode: data.error_code || null,
                  errorMessage: data.error_message || null,
                  paymentLink: data.payment_link || null,
                  paymentMethod: data.payment_method || null,
                  paymentMethodType: data.payment_method_type || null,
                  settlementAmount: data.settlement_amount || null,
                  settlementCurrency: data.settlement_currency || null,
                  settlementTax: data.settlement_tax || null,
                  status: data.status || null,
                  subscriptionId: data.subscription_id || null,
                  tax: data.tax || null,
                  totalAmount: data.total_amount,
                  billing: data.billing || null,
                  customer: data.customer || null,
                  disputes: data.disputes || null,
                  metadata: data.metadata || null,
                  productCart: data.product_cart || null,
                  refunds: data.refunds || null,
                  userId: validUserId,
                };

                console.log('💾 Final payment data:', {
                  id: paymentData.id,
                  status: paymentData.status,
                  userId: paymentData.userId,
                  totalAmount: paymentData.totalAmount,
                  currency: paymentData.currency,
                });

                await db
                  .insert(payment)
                  .values(paymentData)
                  .onConflictDoUpdate({
                    target: payment.id,
                    set: {
                      updatedAt: paymentData.updatedAt || new Date(),
                      status: paymentData.status,
                      errorCode: paymentData.errorCode,
                      errorMessage: paymentData.errorMessage,
                      digitalProductsDelivered: paymentData.digitalProductsDelivered,
                      disputes: paymentData.disputes,
                      refunds: paymentData.refunds,
                      metadata: paymentData.metadata,
                      userId: paymentData.userId,
                    },
                  });

                console.log('✅ Upserted payment:', data.payment_id);

                if (validUserId) {
                  invalidateUserCaches(validUserId);
                  console.log('🗑️ Invalidated caches for user:', validUserId);
                }
              } catch (error) {
                console.error('💥 Error processing payment webhook:', error);
              }
            }
          },
        }),
      ],
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      getCustomerCreateParams: async ({ user: newUser }) => {
        console.log('🚀 getCustomerCreateParams called for user:', newUser.id);

        try {
          const { result: existingCustomers } = await polarClient.customers.list({
            email: newUser.email,
          });

          const existingCustomer = existingCustomers.items[0];

          if (existingCustomer && existingCustomer.externalId && existingCustomer.externalId !== newUser.id) {
            console.log(
              `🔗 Found existing customer ${existingCustomer.id} with external ID ${existingCustomer.externalId}`,
            );
            console.log(`🔄 Updating user ID from ${newUser.id} to ${existingCustomer.externalId}`);

            await db.update(user).set({ id: existingCustomer.externalId }).where(eq(user.id, newUser.id));

            console.log(`✅ Updated user ID to match existing external ID: ${existingCustomer.externalId}`);
          }

          return {};
        } catch (error) {
          console.error('💥 Error in getCustomerCreateParams:', error);
          return {};
        }
      },
      use: [
        checkout({
          products: [
            {
              productId:
                process.env.NEXT_PUBLIC_STARTER_TIER ||
                (() => {
                  throw new Error('NEXT_PUBLIC_STARTER_TIER environment variable is required');
                })(),
              slug:
                process.env.NEXT_PUBLIC_STARTER_SLUG ||
                (() => {
                  throw new Error('NEXT_PUBLIC_STARTER_SLUG environment variable is required');
                })(),
            },
          ],
          successUrl: `/success`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret:
            process.env.POLAR_WEBHOOK_SECRET ||
            (() => {
              throw new Error('POLAR_WEBHOOK_SECRET environment variable is required');
            })(),
          onPayload: async ({ data, type }) => {
            if (
              type === 'subscription.created' ||
              type === 'subscription.active' ||
              type === 'subscription.canceled' ||
              type === 'subscription.revoked' ||
              type === 'subscription.uncanceled' ||
              type === 'subscription.updated'
            ) {
              console.log('🎯 Processing subscription webhook:', type);
              console.log('📦 Payload data:', JSON.stringify(data, null, 2));

              try {
                const userId = data.customer?.externalId;

                let validUserId = null;
                if (userId) {
                  try {
                    const userExists = await db.query.user.findFirst({
                      where: eq(user.id, userId),
                      columns: { id: true },
                    });
                    validUserId = userExists ? userId : null;

                    if (!userExists) {
                      console.warn(
                        `⚠️ User ${userId} not found, creating subscription without user link - will auto-link when user signs up`,
                      );
                    }
                  } catch (error) {
                    console.error('Error checking user existence:', error);
                  }
                } else {
                  console.error('🚨 No external ID found for subscription', {
                    subscriptionId: data.id,
                    customerId: data.customerId,
                  });
                }
                const subscriptionData = {
                  id: data.id,
                  createdAt: new Date(data.createdAt),
                  modifiedAt: safeParseDate(data.modifiedAt),
                  amount: data.amount,
                  currency: data.currency,
                  recurringInterval: data.recurringInterval,
                  status: data.status,
                  currentPeriodStart: safeParseDate(data.currentPeriodStart) || new Date(),
                  currentPeriodEnd: safeParseDate(data.currentPeriodEnd) || new Date(),
                  cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
                  canceledAt: safeParseDate(data.canceledAt),
                  startedAt: safeParseDate(data.startedAt) || new Date(),
                  endsAt: safeParseDate(data.endsAt),
                  endedAt: safeParseDate(data.endedAt),
                  customerId: data.customerId,
                  productId: data.productId,
                  discountId: data.discountId || null,
                  checkoutId: data.checkoutId || '',
                  customerCancellationReason: data.customerCancellationReason || null,
                  customerCancellationComment: data.customerCancellationComment || null,
                  metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                  customFieldData: data.customFieldData ? JSON.stringify(data.customFieldData) : null,
                  userId: validUserId,
                };

                console.log('💾 Final subscription data:', {
                  id: subscriptionData.id,
                  status: subscriptionData.status,
                  userId: subscriptionData.userId,
                  amount: subscriptionData.amount,
                });

                await db
                  .insert(subscription)
                  .values(subscriptionData)
                  .onConflictDoUpdate({
                    target: subscription.id,
                    set: {
                      modifiedAt: subscriptionData.modifiedAt || new Date(),
                      amount: subscriptionData.amount,
                      currency: subscriptionData.currency,
                      recurringInterval: subscriptionData.recurringInterval,
                      status: subscriptionData.status,
                      currentPeriodStart: subscriptionData.currentPeriodStart,
                      currentPeriodEnd: subscriptionData.currentPeriodEnd,
                      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                      canceledAt: subscriptionData.canceledAt,
                      startedAt: subscriptionData.startedAt,
                      endsAt: subscriptionData.endsAt,
                      endedAt: subscriptionData.endedAt,
                      customerId: subscriptionData.customerId,
                      productId: subscriptionData.productId,
                      discountId: subscriptionData.discountId,
                      checkoutId: subscriptionData.checkoutId,
                      customerCancellationReason: subscriptionData.customerCancellationReason,
                      customerCancellationComment: subscriptionData.customerCancellationComment,
                      metadata: subscriptionData.metadata,
                      customFieldData: subscriptionData.customFieldData,
                      userId: subscriptionData.userId,
                    },
                  });

                console.log('✅ Upserted subscription:', data.id);

                if (validUserId) {
                  invalidateUserCaches(validUserId);
                  console.log('🗑️ Invalidated caches for user:', validUserId);
                }
              } catch (error) {
                console.error('💥 Error processing subscription webhook:', error);
              }
            }
          },
        }),
      ],
    }),
    nextCookies(),
  ],
  trustedOrigins: (serverEnv.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  allowedOrigins: (serverEnv.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
});
