import type { RequestHandler } from '@builder.io/qwik-city'
import { getEnv } from '~/utils/env'

export const onPost: RequestHandler = async ({ request, json }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://localhost:3000')
  
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      json(400, { error: 'Reference is required' })
      return
    }

    console.log('[subscriptions/verify] CMS_URL:', cmsUrl)
    console.log('[subscriptions/verify] Verifying payment reference:', reference)

    // Forward verification request to CMS
    const response = await fetch(`${cmsUrl}/api/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference }),
    })

    console.log('[subscriptions/verify] CMS response status:', response.status)

    const data = await response.json()
    console.log('[subscriptions/verify] CMS response:', data)

    json(response.status, data)
  } catch (error: any) {
    console.error('[subscriptions/verify] Error:', error)
    json(500, {
      success: false,
      message: error.message || 'Failed to verify payment',
    })
  }
}
