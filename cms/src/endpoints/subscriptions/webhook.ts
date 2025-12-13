import type { PayloadHandler } from 'payload'

/**
 * POST /api/subscriptions/webhook
 * Handle subscription creation after successful payment
 *
 * This webhook is called after payment verification to create the actual subscription record
 *
 * Request body:
 * - reference: Paystack transaction reference
 * - user_id: User ID (from metadata)
 * - plan_id: Subscription plan ID
 */
export const subscriptionWebhook: PayloadHandler = async (req) => {
  const { payload } = req
  const body = req.json ? await req.json() : {}
  const { reference, user_id, plan_id } = body

  if (!reference || !user_id || !plan_id) {
    console.error('[subscriptions/webhook] Missing required fields:', { reference, user_id, plan_id })
    return Response.json(
      { error: 'Missing required fields: reference, user_id, and plan_id are required' },
      { status: 400 }
    )
  }

  // Validate user_id is not empty
  const userIdStr = String(user_id).trim()
  if (!userIdStr) {
    console.error('[subscriptions/webhook] user_id is empty or invalid')
    return Response.json(
      { error: 'user_id cannot be empty' },
      { status: 400 }
    )
  }

  try {
    // Ensure plan_id is a number
    const planIdNum = typeof plan_id === 'string' ? parseInt(plan_id, 10) : plan_id
    
    if (isNaN(planIdNum)) {
      console.error('[subscriptions/webhook] plan_id is not a valid number:', plan_id)
      return Response.json(
        { error: 'plan_id must be a valid number' },
        { status: 400 }
      )
    }
    
    console.log('[subscriptions/webhook] Creating subscription for user:', userIdStr, 'plan:', planIdNum)

    // Check if subscription already exists for this user
    const existingSubscriptions = await payload.find({
      collection: 'user-subscriptions',
      where: {
        and: [
          {
            user: {
              equals: userIdStr,
            },
          },
          {
            status: {
              in: ['active', 'non-renewing'],
            },
          },
        ],
      },
    })

    if (existingSubscriptions.docs.length > 0) {
      console.log('[subscriptions/webhook] User already has active subscription:', userIdStr)
      return Response.json(
        { 
          message: 'User already has an active subscription',
          subscription_id: existingSubscriptions.docs[0].id,
        },
        { status: 200 }
      )
    }

    // Create the subscription record
    console.log('[subscriptions/webhook] Creating subscription with plan_id:', planIdNum, 'for user:', userIdStr)
    
    const subscription = await payload.create({
      collection: 'user-subscriptions',
      data: {
        user: userIdStr,
        plan: planIdNum,
        status: 'active' as const,
        current_period_start: new Date().toISOString(),
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paystack_subscription_code: reference,
      },
    })

    console.log('[subscriptions/webhook] Subscription created successfully:', {
      subscription_id: subscription.id,
      user_id: subscription.user,
      plan_id: subscription.plan,
    })

    return Response.json({
      success: true,
      message: 'Subscription created successfully',
      subscription_id: subscription.id,
    })
  } catch (error: any) {
    console.error('[subscriptions/webhook] Error creating subscription:', error)
    return Response.json(
      {
        success: false,
        message: error.message || 'Failed to create subscription',
      },
      { status: 500 }
    )
  }
}
