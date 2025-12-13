import type { RequestHandler } from '@builder.io/qwik-city'
import { getEnv } from '~/utils/env'

export const onPost: RequestHandler = async ({ request, json }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://localhost:3000')
  
  try {
    const body = await request.json()
    const { reference, user_id, plan_id } = body

    if (!reference || !user_id || !plan_id) {
      json(400, { error: 'Missing required fields' })
      return
    }

    console.log('[subscriptions/webhook] Creating subscription for user:', user_id)

    // Forward webhook request to CMS
    const response = await fetch(`${cmsUrl}/api/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference, user_id, plan_id }),
    })

    console.log('[subscriptions/webhook] CMS response status:', response.status)

    const data = await response.json()
    console.log('[subscriptions/webhook] CMS response:', data)

    json(response.status, data)
  } catch (error: any) {
    console.error('[subscriptions/webhook] Error:', error)
    json(500, {
      success: false,
      message: error.message || 'Failed to create subscription',
    })
  }
}
