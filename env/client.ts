// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).url(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().min(1).url(),
    NEXT_PUBLIC_GOOGLE_MAPS_PLACE_URL_TEMPLATE: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_SEARCH_URL_TEMPLATE: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_DIR_URL_TEMPLATE: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_FAVICON_URL: z.string().optional(),
    NEXT_PUBLIC_OG_CHAT_URL_TEMPLATE: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_PLACE_URL_TEMPLATE: process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLACE_URL_TEMPLATE,
    NEXT_PUBLIC_GOOGLE_MAPS_SEARCH_URL_TEMPLATE: process.env.NEXT_PUBLIC_GOOGLE_MAPS_SEARCH_URL_TEMPLATE,
    NEXT_PUBLIC_GOOGLE_MAPS_DIR_URL_TEMPLATE: process.env.NEXT_PUBLIC_GOOGLE_MAPS_DIR_URL_TEMPLATE,
    NEXT_PUBLIC_GOOGLE_FAVICON_URL: process.env.NEXT_PUBLIC_GOOGLE_FAVICON_URL,
    NEXT_PUBLIC_OG_CHAT_URL_TEMPLATE: process.env.NEXT_PUBLIC_OG_CHAT_URL_TEMPLATE,
  },
});
