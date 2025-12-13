/**
 * Subscription Cancel API
 * DELETE /api/subscriptions/[id]
 * POST /api/subscriptions/[id]/cancel
 *
 * Cancels or removes a user's subscription
 */

import type { RequestHandler } from '@builder.io/qwik-city'
import { getEnv } from '~/utils/env'

export const onDelete: RequestHandler = async ({ params, json, error, cookie }) => {
  const subscriptionId = params.id
  const cmsUrl = getEnv('CMS_URL', 'http://localhost:3000')

  if (!subscriptionId) {
    throw error(400, 'Subscription ID is required')
  }

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`
    }

    const response = await fetch(`${cmsUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscription_id: parseInt(subscriptionId, 10) }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw error(response.status as 400 | 401 | 403 | 404 | 500, data.message || 'Failed to cancel subscription')
    }

    json(200, {
      success: true,
      message: 'Subscription cancelled successfully',
      subscription_id: subscriptionId,
    })
  } catch (err: any) {
    console.error('[subscriptions/cancel] Error:', err)
    throw error(500, `Failed to cancel subscription: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export const onPost: RequestHandler = onDelete
