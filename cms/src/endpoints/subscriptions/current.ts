import type { PayloadHandler } from 'payload'
import { getUserActiveSubscription, handleAuthError } from '@/utils/subscription-auth'

/**
 * GET /api/subscriptions/current
 * Get the user's current subscription
 *
 * Returns:
 * - subscription: current subscription object with plan details
 * - null if no active subscription
 */
export const getCurrentSubscription: PayloadHandler = async (req) => {
  try {
    const subscription = await getUserActiveSubscription(req)

    // Optionally fetch latest status from Paystack
    if (subscription.paystack_subscription_code) {
      try {
        const paystackResponse = await fetch(
          `https://api.paystack.co/subscription/${subscription.paystack_subscription_code}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        )

        const paystackData = await paystackResponse.json()

        if (paystackData.status && paystackData.data) {
          // Update subscription if status changed on Paystack
          const paystackStatus = paystackData.data.status
          let localStatus = subscription.status

          if (paystackStatus === 'active' && localStatus !== 'active') {
            localStatus = 'active'
          } else if (paystackStatus === 'non-renewing' && localStatus !== 'non-renewing') {
            localStatus = 'non-renewing'
          } else if (
            (paystackStatus === 'cancelled' || paystackStatus === 'completed') &&
            localStatus !== 'cancelled'
          ) {
            localStatus = 'cancelled'
          }

          // Update if changed
          if (localStatus !== subscription.status) {
            const { payload } = req
            await payload.update({
              collection: 'user-subscriptions',
              id: subscription.id,
              data: {
                status: localStatus,
                next_payment_date: paystackData.data.next_payment_date,
              },
            })

            subscription.status = localStatus
            subscription.next_payment_date = paystackData.data.next_payment_date
          }
        }
      } catch (error: any) {
        // Log but don't fail if Paystack check fails
        console.error('Failed to sync subscription status from Paystack:', error)
      }
    }

    return Response.json({ subscription }, { status: 200 })
  } catch (error: any) {
    // No active subscription is not an error - return null
    if (error.message?.includes('No active subscription')) {
      return Response.json({ subscription: null }, { status: 200 })
    }
    return handleAuthError(error)
  }
}
