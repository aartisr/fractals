import { PayloadSDK } from '@payloadcms/sdk'
// @ts-ignore: fallback type if payload-types is missing
export type GeneratedTypes = any;

// Qwik SSR: prefer server-side env var
const CMS_URL = (globalThis as any)?.process?.env?.CMS_URL || import.meta.env?.CMS_URL
const CMS_API_KEY = (globalThis as any)?.process?.env?.CMS_API_KEY || import.meta.env?.CMS_API_KEY

export const payload = new PayloadSDK<GeneratedTypes>({
  baseURL: `${CMS_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/api`,
  baseInit: CMS_API_KEY ? {
    headers: {
      'Authorization': `users API-Key ${CMS_API_KEY}`,
    },
  } : undefined,
})

