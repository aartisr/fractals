import type { PayloadHandler } from 'payload'
import { requireAuth } from '@/utils/auth'

/**
 * POST /api/subscriptions/create
 * Initialize a new subscription
 *
 * Request body:
 * - planId: ID of the subscription plan
 *
 * Returns:
 * - authorization_url: URL to redirect user for payment
 * - access_code: Paystack access code
 * - reference: Transaction reference
 */
export const createSubscription: PayloadHandler = async (req) => {
  const user = await requireAuth(req)
  const { payload } = req
  const body = req.json ? await req.json() : {}
  const { planId } = body

  if (!planId) {
    return Response.json({ error: 'planId is required' }, { status: 400 })
  }

  try {
    // Fetch the plan
    const plan = await payload.findByID({
      collection: 'subscription-plans',
      id: planId,
    })

    if (!plan || !plan.is_active) {
      return Response.json({ error: 'Plan not found or inactive' }, { status: 404 })
    }

    // Check if user already has an active subscription
    const existingSubscriptions = await payload.find({
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
    })

    if (existingSubscriptions.docs.length > 0) {
      return Response.json(
        {
          error: 'User already has an active subscription',
          subscription: existingSubscriptions.docs[0],
        },
        { status: 400 }
      )
    }

    // Get user email from auth.kailasa.ai (now available from requireAuth)
    const userEmail = user.email || `user-${user.id}@kailasa.ai`

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount: plan.amount, // Amount already in cents for USD
        plan: plan.paystack_plan_code,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_name: plan.name,
        },
        callback_url: `${process.env.WEB_URL}/subscription/callback`,
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Paystack initialization failed')
    }

    // Log the payment event
    await payload.create({
      collection: 'payment-events',
      data: {
        event_type: 'subscription.initialize',
        event_source: 'system',
        user: String(user.id),
        paystack_payload: paystackData,
        processed: false,
      },
    })

    return Response.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    })
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    return Response.json(
      {
        error: 'Failed to initialize subscription',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
