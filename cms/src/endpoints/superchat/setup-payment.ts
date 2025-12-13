import type { PayloadHandler } from 'payload'
import { requireAuthenticatedUser, handleAuthError } from '@/utils/subscription-auth'

/**
 * POST /api/superchat/setup-payment
 * Initialize payment method authorization for superchat
 *
 * Returns:
 * - authorization_url: URL to redirect user for card authorization
 * - access_code: Paystack access code
 * - reference: Transaction reference
 */
export const setupPayment: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req

    // Get user email from auth.kailasa.ai (now available from requireAuthenticatedUser)
    const userEmail = user.email || `user-${user.id}@kailasa.ai`

    // Initialize a $1.00 (100 cents) authorization transaction
    // This is just to get the authorization code, user will be charged this small amount
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount: 100, // $1.00 in cents (minimum for authorization)
        metadata: {
          user_id: user.id,
          purpose: 'payment_method_setup',
        },
        callback_url: `${process.env.WEB_URL}/superchat/setup-callback`,
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
        event_type: 'payment_method.setup_initialize',
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
    }, { status: 200 })
  } catch (error) {
    console.error('Error setting up payment method:', error)
    return handleAuthError(error) || Response.json({
      error: 'Failed to initialize payment method setup',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
