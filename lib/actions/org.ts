"use server";

import { getUserWithOrganization } from "@/lib/auth-utils";

export async function getCurrentUser() {
  "use server";

  const { getComprehensiveUserData } = await import("@/lib/user-data-server");
  return await getComprehensiveUserData();
}

export async function getOrganizationContext() {
  "use server";

  try {
    return await getUserWithOrganization();
  } catch (error) {
    console.error("Error getting organization context:", error);
    return null;
  }
}


