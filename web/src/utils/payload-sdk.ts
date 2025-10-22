import { PayloadSDK } from '@payloadcms/sdk'
import type { GeneratedTypes } from './payload-types'

// Qwik SSR: prefer server-side env var
const CMS_URL = (globalThis as any)?.process?.env?.CMS_URL || import.meta.env?.CMS_URL

export const payload = new PayloadSDK<GeneratedTypes>({
  baseURL: `${CMS_URL?.replace(/\/$/, '') || 'http://localhost:3001'}/api`,
})

