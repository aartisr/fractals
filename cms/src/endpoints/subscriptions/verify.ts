import type { PayloadHandler } from 'payload'

/**
 * POST /api/subscriptions/verify
 * Verify a Paystack payment transaction
 *
 * Request body:
 * - reference: Paystack transaction reference
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - reference: transaction reference
 * - status: payment status ('success', 'pending', 'failed', etc.)
 */
export const verifySubscription: PayloadHandler = async (req) => {
  const body = req.json ? await req.json() : {}
  const { reference } = body

  if (!reference) {
    return Response.json({ error: 'Reference is required' }, { status: 400 })
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

    if (!paystackSecretKey) {
      console.error('[subscriptions/verify] PAYSTACK_SECRET_KEY not configured')
      return Response.json(
        { error: 'Payment verification not configured' },
        { status: 500 }
      )
    }

    console.log('[subscriptions/verify] Verifying payment with reference:', reference)

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    )

    if (!verifyResponse.ok) {
      console.error('[subscriptions/verify] Paystack verification failed:', verifyResponse.status)
      return Response.json(
        { success: false, message: 'Payment verification failed' },
        { status: 400 }
      )
    }

    const verifyData = await verifyResponse.json()
    console.log('[subscriptions/verify] Paystack response:', {
      status: verifyData.status,
      paymentStatus: verifyData.data?.status,
    })

    if (verifyData.status && verifyData.data?.status === 'success') {
      // Payment successful
      return Response.json({
        success: true,
        message: 'Payment verified successfully',
        reference,
        status: 'success',
        // Include metadata from the transaction so the callback can create subscription
        metadata: verifyData.data?.metadata || {},
      })
    } else {
      return Response.json({
        success: false,
        message: 'Payment not successful',
        reference,
        status: verifyData.data?.status || 'unknown',
      })
    }
  } catch (error: any) {
    console.error('[subscriptions/verify] Error:', error)
    return Response.json(
      {
        success: false,
        message: error.message || 'Failed to verify payment',
        reference,
      },
      { status: 500 }
    )
  }
}
