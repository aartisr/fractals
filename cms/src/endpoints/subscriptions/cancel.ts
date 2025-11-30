import type { PayloadHandler } from 'payload'
import { requireAuth } from '@/utils/auth'

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
  const user = await requireAuth(req)
  const { payload } = req
  const body = req.json ? await req.json() : {}
  const { subscriptionId } = body

  try {
    let subscription

    if (subscriptionId) {
      // Fetch specific subscription
      subscription = await payload.findByID({
        collection: 'user-subscriptions',
        id: subscriptionId,
      })

      // Verify ownership
      if (subscription.user !== String(user.id)) {
        return Response.json({ error: 'Not authorized to cancel this subscription' }, { status: 403 })
      }
    } else {
      // Find user's active subscription
      const subscriptions = await payload.find({
        collection: 'user-subscriptions',
        where: {
          and: [
            {
              user: {
                equals: String(user.id),
              },
            },
            {
              status: {
                in: ['active', 'non-renewing'],
              },
            },
          ],
        },
        limit: 1,
      })

      if (subscriptions.docs.length === 0) {
        return Response.json({ error: 'No active subscription found' }, { status: 404 })
      }

      subscription = subscriptions.docs[0]
    }

    if (!subscription.paystack_subscription_code) {
      return Response.json(
        { error: 'Invalid subscription: missing Paystack subscription code' },
        { status: 400 }
      )
    }

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
    return Response.json(
      {
        error: 'Failed to cancel subscription',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
