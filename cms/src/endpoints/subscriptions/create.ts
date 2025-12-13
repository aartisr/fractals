import type { PayloadHandler } from 'payload'
import { requireAuthenticatedUser, handleAuthError } from '@/utils/subscription-auth'

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
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req
    const body = req.json ? await req.json() : {}
    const { planId } = body

    if (!planId) {
      throw {
        status: 400,
        message: 'planId is required',
      }
    }

    console.log('[subscriptions/create] Authenticated user:', { id: user.id, email: user.email })
    
    // Fetch the plan using REST API instead of payload.findByID
    const planNumId = Number(planId)
    console.log('[subscriptions/create] Fetching plan:', planNumId)
    
    const planResponse = await fetch(`http://localhost:3000/api/subscription-plans/${planNumId}`)
    if (!planResponse.ok) {
      console.error('[subscriptions/create] Plan fetch failed:', planResponse.status)
      throw {
        status: 404,
        message: 'Plan not found',
      }
    }
    
    const plan = await planResponse.json()
    console.log('[subscriptions/create] Found plan:', plan)

    if (!plan || !plan.is_active) {
      throw {
        status: 404,
        message: 'Plan not found or inactive',
      }
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
      throw {
        status: 400,
        message: 'User already has an active subscription',
      }
    }

    // Get user email from auth.kailasa.ai (now available from requireAuth)
    const userEmail = user.email || `user-${user.id}@kailasa.ai`
    const userId = String(user.id)

    console.log('[subscriptions/create] User details:', {
      userId,
      userEmail,
      planId,
      planName: plan.name,
      planAmount: plan.amount,
    })

    // Initialize Paystack transaction
    const paystackBody: any = {
      email: userEmail,
      amount: plan.amount, // Amount already in cents for USD
      metadata: {
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
      },
      callback_url: `${process.env.WEB_URL}/subscription/callback`,
    }
    
    // Don't include plan code for now - requires setup in Paystack dashboard
    // In production, validate that the plan code exists in Paystack before using it
    console.log('[subscriptions/create] Creating standalone Paystack transaction (no plan code)')

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackBody),
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
    return handleAuthError(error)
  }
}
