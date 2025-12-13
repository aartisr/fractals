import type { PayloadHandler } from 'payload'
import {
  requireAuthenticatedUser,
  requireSubscriptionOwnership,
  getUserActiveSubscription,
  validatePaystackCode,
  handleAuthError,
} from '@/utils/subscription-auth'

/**
 * POST /api/subscriptions/cancel
 * Cancel an active subscription
 *
 * Request body:
 * - subscriptionId: ID of the subscription to cancel (optional, defaults to user's active subscription)
 *
 * Returns:
 * - success: boolean
 * - subscription: updated subscription object
 */
export const cancelSubscription: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const body = req.json ? await req.json() : {}
    const { subscriptionId } = body

    let subscription

    if (subscriptionId) {
      // Verify user owns this subscription
      subscription = await requireSubscriptionOwnership(req, subscriptionId)
    } else {
      // Get user's active subscription
      subscription = await getUserActiveSubscription(req)
    }

    // Validate Paystack subscription code
    validatePaystackCode(subscription)
    const { payload } = req

    // Cancel subscription on Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription.paystack_subscription_code,
        token: subscription.paystack_email_token,
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Failed to cancel subscription on Paystack')
    }

    // Update subscription in database
    const updatedSubscription = await payload.update({
      collection: 'user-subscriptions',
      id: subscription.id,
      data: {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
    })

    // Log the event
    await payload.create({
      collection: 'payment-events',
      data: {
        event_type: 'subscription.cancelled',
        event_source: 'system',
        user: String(user.id),
        subscription: subscription.id,
        paystack_payload: paystackData,
        processed: true,
        processed_at: new Date().toISOString(),
      },
    })

    return Response.json({
      success: true,
      subscription: updatedSubscription,
    })
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return handleAuthError(error)
  }
}
