import type { PayloadHandler } from 'payload'
import { requireAuth } from '@/utils/auth'

/**
 * GET /api/subscriptions/manage-link
 * Get Paystack subscription management link
 *
 * Query params:
 * - subscriptionId: ID of the subscription (optional, defaults to user's active subscription)
 *
 * Returns:
 * - link: URL to manage subscription on Paystack
 */
export const getManageLink: PayloadHandler = async (req) => {
  const user = await requireAuth(req)
  const { payload } = req
  const { subscriptionId } = req.query

  try {
    let subscription

    if (subscriptionId) {
      // Fetch specific subscription
      subscription = await payload.findByID({
        collection: 'user-subscriptions',
        id: subscriptionId as string,
      })

      // Verify ownership
      if (subscription.user !== String(user.id)) {
        return Response.json({ error: 'Not authorized to access this subscription' }, { status: 403 })
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

    if (!subscription.paystack_subscription_code || !subscription.paystack_email_token) {
      return Response.json({
        error: 'Invalid subscription: missing Paystack subscription code or email token'
      }, { status: 400 })
    }

    // Generate management link
    const managementLink = `https://api.paystack.co/subscription/${subscription.paystack_subscription_code}/manage/link/${subscription.paystack_email_token}`

    // Fetch the actual link from Paystack
    const paystackResponse = await fetch(managementLink, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Failed to get management link')
    }

    return Response.json({
      success: true,
      link: paystackData.data.link,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error getting management link:', error)
    return Response.json({
      error: 'Failed to get management link',
      message: error.message,
    }, { status: 500 })
  }
}
