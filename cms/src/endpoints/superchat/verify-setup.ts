import type { PayloadHandler } from 'payload'
import { requireAuthenticatedUser, handleAuthError } from '@/utils/subscription-auth'

/**
 * GET /api/superchat/verify-setup?reference={reference}
 * Verify payment method setup with Paystack and save the authorization
 *
 * Returns:
 * - success: boolean
 * - authorization: saved payment method details
 */
export const verifySetup: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req

    const url = new URL(req.url || '', 'http://localhost')
    const reference = url.searchParams.get('reference')

    if (!reference) {
      return Response.json({
        success: false,
        error: 'Payment reference is required',
      }, { status: 400 })
    }

    // Verify the transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || !paystackData.data) {
      return Response.json({
        success: false,
        error: paystackData.message || 'Payment verification failed',
      }, { status: 400 })
    }

    const transaction = paystackData.data

    // Check if transaction was successful
    if (transaction.status !== 'success') {
      return Response.json({
        success: false,
        error: `Transaction status: ${transaction.status}`,
      }, { status: 400 })
    }

    // Check if authorization was obtained
    if (!transaction.authorization || !transaction.authorization.authorization_code) {
      return Response.json({
        success: false,
        error: 'No authorization code received from payment gateway',
      }, { status: 400 })
    }

    const auth = transaction.authorization

    // Check if this payment method already exists for this user
    const existingMethods = await payload.find({
      collection: 'user-payment-methods',
      where: {
        and: [
          {
            user: {
              equals: String(user.id),
            },
          },
          {
            authorization_code: {
              equals: auth.authorization_code,
            },
          },
        ],
      },
    })

    let paymentMethod

    if (existingMethods.docs.length > 0) {
      // Update existing payment method
      paymentMethod = existingMethods.docs[0]
    } else {
      // If this is the first payment method, make it default
      const userMethods = await payload.find({
        collection: 'user-payment-methods',
        where: {
          user: {
            equals: String(user.id),
          },
        },
      })

      const isFirstMethod = userMethods.docs.length === 0

      // Create new payment method
      paymentMethod = await payload.create({
        collection: 'user-payment-methods',
        data: {
          user: String(user.id),
          authorization_code: auth.authorization_code,
          last4: auth.last4,
          exp_month: auth.exp_month,
          exp_year: auth.exp_year,
          card_type: auth.card_type,
          bank: auth.bank,
          brand: auth.brand,
          is_default: isFirstMethod,
        },
      })
    }

    // Log the successful setup
    await payload.create({
      collection: 'payment-events',
      data: {
        event_type: 'payment_method.setup_complete',
        event_source: 'system',
        user: String(user.id),
        paystack_payload: paystackData,
        processed: true,
      },
    })

    return Response.json({
      success: true,
      authorization: {
        id: paymentMethod.id,
        last4: paymentMethod.last4,
        brand: paymentMethod.card_type,
        bank: paymentMethod.bank,
        is_default: paymentMethod.is_default,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Error verifying payment setup:', error)
    return handleAuthError(error) || Response.json({
      success: false,
      error: 'Failed to verify payment setup',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
