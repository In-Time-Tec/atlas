"use server";

import { getUser } from "@/lib/auth-utils";
import { getDiscountConfig } from "@/lib/discount";
import { getPaymentsByUserId } from "@/lib/db/queries";

export async function getSubDetails() {
  "use server";

  const { getComprehensiveUserData } = await import("@/lib/user-data-server");
  const userData = await getComprehensiveUserData();
  if (!userData) return { hasSubscription: false } as const;

  return userData.polarSubscription
    ? ({ hasSubscription: true, subscription: userData.polarSubscription } as const)
    : ({ hasSubscription: false } as const);
}

export async function getDiscountConfigAction() {
  "use server";
  try {
    return await getDiscountConfig();
  } catch (error) {
    console.error("Error getting discount configuration:", error);
    return { enabled: false } as const;
  }
}

export async function getPaymentHistory() {
  try {
    const user = await getUser();
    if (!user) return null;
    const payments = await getPaymentsByUserId({ userId: user.id });
    return payments;
  } catch (error) {
    console.error("Error getting payment history:", error);
    return null;
  }
}

export async function getDodoPaymentsProStatus() {
  "use server";
  const { getComprehensiveUserData } = await import("@/lib/user-data-server");
  const userData = await getComprehensiveUserData();
  if (!userData) return { isProUser: false, hasPayments: false } as const;

  const isDodoProUser = userData.proSource === "dodo" && userData.isProUser;
  return {
    isProUser: isDodoProUser,
    hasPayments: Boolean(userData.dodoPayments?.hasPayments),
    expiresAt: userData.dodoPayments?.expiresAt,
    source: userData.proSource,
    daysUntilExpiration: userData.dodoPayments?.daysUntilExpiration,
    isExpired: userData.dodoPayments?.isExpired,
    isExpiringSoon: userData.dodoPayments?.isExpiringSoon,
  } as const;
}

export async function getDodoExpirationDate() {
  "use server";
  const { getComprehensiveUserData } = await import("@/lib/user-data-server");
  const userData = await getComprehensiveUserData();
  return userData?.dodoPayments?.expiresAt || null;
}


