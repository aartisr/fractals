import type { PayloadHandler } from 'payload'
import { requireAuthenticatedUser, handleAuthError } from '@/utils/subscription-auth'

/**
 * POST /api/superchat/send
 * Send a superchat message with instant charge
 *
 * Request body:
 * - streamId: ID of the live stream
 * - message: Superchat message (max 500 characters)
 * - amount: Amount in cents (minimum 100 = $1.00)
 * - paymentMethodId: ID of the payment method to use (optional, uses default if not provided)
 *
 * Returns:
 * - success: boolean
 * - superchat: created superchat object
 * - charge: Paystack charge response
 */
export const sendSuperchat: PayloadHandler = async (req) => {
  try {
    const user = requireAuthenticatedUser(req)
    const { payload } = req
    const body = req.json ? await req.json() : {}
    const { streamId, message, amount, paymentMethodId } = body

    // Validate input
    if (!streamId || !message || !amount) {
      return Response.json({
        error: 'streamId, message, and amount are required',
      }, { status: 400 })
    }

    if (amount < 100) {
      return Response.json({
        error: 'Minimum superchat amount is $1.00 (100 cents)',
      }, { status: 400 })
    }

    if (message.length > 500) {
      return Response.json({
        error: 'Message must be 500 characters or less',
      }, { status: 400 })
    }
    try {
    // Verify stream exists (allow superchats on any stream regardless of status)
    const stream = await payload.findByID({
      collection: 'live-streams',
      id: Number(streamId),
    })

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Get payment method
    let paymentMethod

    if (paymentMethodId) {
      paymentMethod = await payload.findByID({
        collection: 'user-payment-methods',
        id: paymentMethodId,
      })

      // Verify ownership
      if (paymentMethod.user !== String(user.id)) {
        return Response.json({ error: 'Not authorized to use this payment method' }, { status: 403 })
      }

      if (!paymentMethod.is_active) {
        return Response.json({ error: 'Payment method is not active' }, { status: 400 })
      }
    } else {
      // Find default payment method
      const paymentMethods = await payload.find({
        collection: 'user-payment-methods',
        where: {
          and: [
            {
              user: {
                equals: String(user.id),
              },
            },
            {
              is_default: {
                equals: true,
              },
            },
            {
              is_active: {
                equals: true,
              },
            },
          ],
        },
        limit: 1,
      })

      if (paymentMethods.docs.length === 0) {
        return Response.json({
          error: 'No default payment method found. Please set up a payment method first.',
        }, { status: 400 })
      }

      paymentMethod = paymentMethods.docs[0]
    }

    // Get user email
    const userEmail = user.email || `user-${user.id}@kailasa.ai`

    // Generate transaction reference
    const reference = `SC_${user.id}_${Date.now()}`

    // Charge the authorization code
    const paystackResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: paymentMethod.authorization_code,
        email: userEmail,
        amount: amount,
        reference: reference,
        metadata: {
          user_id: user.id,
          stream_id: streamId,
          purpose: 'superchat',
          message: message.substring(0, 100), // First 100 chars for metadata
        },
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Charge failed')
    }

    // Fetch tier configuration from database
    const tiers = await payload.find({
      collection: 'superchat-tiers',
      where: {
        is_active: {
          equals: true,
        },
      },
      sort: '-min_amount', // Sort by amount descending to find the highest tier first
    })

    // Calculate tier and styling based on amount (in cents)
    let tier: 'blue' | 'gold' | 'orange' | 'pink' | 'red' = 'blue'
    let highlightColor = '#2196F3'
    let pinDuration = 30

    // Find the appropriate tier based on amount in cents
    for (const tierConfig of tiers.docs) {
      if (amount >= tierConfig.min_amount) {
        tier = tierConfig.tier_id as 'blue' | 'gold' | 'orange' | 'pink' | 'red'
        highlightColor = tierConfig.color
        pinDuration = tierConfig.pin_duration
        break
      }
    }

    // Create superchat message
    const superchat = await payload.create({
      collection: 'superchat-messages',
      data: {
        user: String(user.id),
        stream: Number(streamId),
        message: message,
        amount: amount,
        currency: 'USD',
        tier: tier,
        highlight_color: highlightColor,
        pin_duration_seconds: pinDuration,
        transaction_reference: reference,
        paystack_authorization_code: paymentMethod.authorization_code,
        status: paystackData.data.status === 'success' ? 'success' : 'pending',
        is_visible: true,
        is_pinned: paystackData.data.status === 'success',
        pinned_until:
          paystackData.data.status === 'success'
            ? new Date(Date.now() + pinDuration * 1000).toISOString()
            : null,
      },
    })

    // Log the payment event
    await payload.create({
      collection: 'payment-events',
      data: {
        event_type: 'superchat.charge',
        event_source: 'system',
        user: String(user.id),
        superchat: superchat.id,
        paystack_payload: paystackData,
        processed: true,
        processed_at: new Date().toISOString(),
      },
    })

    // Broadcast superchat to live chat via chat service
    try {
      const chatServiceUrl = process.env.CHAT_SERVICE_URL

      if (chatServiceUrl) {
        // Prepare superchat data for chat service
        const superchatContent = {
          type: 'superchat',
          message: message,
          amount: amount,
          tier: tier,
          highlight_color: highlightColor,
          pin_duration_seconds: pinDuration,
          superchat_id: superchat.id,
          user_id: user.id,
          user_email: user.email,
        }

        // Get the session token for chat service authentication
        const cookies = req.headers?.get('cookie')
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }

        // Chat service expects token in Authorization header (Bearer token)
        if (cookies) {
          const match = cookies.match(/nandi_session_token=([^;]+)/)
          if (match) {
            headers['Authorization'] = `Bearer ${match[1]}`
          }
        }

        // Send to chat service with user's session token for authentication
        const response = await fetch(`${chatServiceUrl}/chat/send`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            streamId: String(streamId),
            content: JSON.stringify(superchatContent),
            type: 'superchat',
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[SUPERCHAT] Chat service broadcast failed:', response.status, errorText)
        } else {
          console.log('[SUPERCHAT] Successfully broadcasted to chat service')
        }
      } else {
        console.warn('[SUPERCHAT] Chat service broadcast skipped - missing CHAT_SERVICE_URL')
      }
    } catch (broadcastError: any) {
      // Don't fail the superchat if broadcast fails - just log it
      console.error('[SUPERCHAT] Failed to broadcast to chat service:', broadcastError.message)
    }

    return Response.json({
      success: true,
      superchat,
      charge: paystackData.data,
    }, { status: 200 })
    } catch (innerError) {
      console.error('Error sending superchat:', innerError)
      throw innerError
    }
  } catch (error) {
    console.error('Error sending superchat:', error)
    return handleAuthError(error) || Response.json({
      error: 'Failed to send superchat',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
