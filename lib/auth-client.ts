import { createAuthClient } from 'better-auth/react';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { polarClient } from '@polar-sh/better-auth';
import { organizationClient } from 'better-auth/client/plugins';

export const betterauthClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [dodopaymentsClient(), organizationClient()],
});

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [polarClient(), organizationClient()],
});

export const { signIn, signOut, signUp, useSession, useActiveOrganization, useListOrganizations, organization } =
  authClient;
export const { organization: betterOrganization } = betterauthClient;
