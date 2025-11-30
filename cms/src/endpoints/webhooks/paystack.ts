import type { PayloadHandler } from 'payload'
import crypto from 'crypto'

/**
 * POST /api/webhooks/paystack
 * Handle Paystack webhook events
 *
 * This endpoint processes various Paystack events:
 * - subscription.create: New subscription created
 * - subscription.disable: Subscription cancelled
 * - subscription.not_renew: Subscription set to non-renewing
 * - charge.success: Successful charge (for subscriptions and payment method setup)
 * - invoice.payment_failed: Failed subscription payment
 *
 * Returns:
 * - success: boolean
 */
export const paystackWebhook: PayloadHandler = async (req) => {
  const { payload } = req

  try {
    const body = req.json ? await req.json() : {}

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(body))
      .digest('hex')

    if (hash !== req.headers.get('x-paystack-signature')) {
      console.error('Invalid webhook signature')
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = body

    // Log the webhook event
    const paymentEvent = await payload.create({
      collection: 'payment-events',
      data: {
        event_type: event.event,
        event_source: 'paystack',
        paystack_event: event.event,
        paystack_payload: event,
        processed: false,
      },
    })

    // Process the event
    try {
      switch (event.event) {
        case 'subscription.create':
          await handleSubscriptionCreate(payload, event, String(paymentEvent.id))
          break

        case 'subscription.disable':
          await handleSubscriptionDisable(payload, event, String(paymentEvent.id))
          break

        case 'subscription.not_renew':
          await handleSubscriptionNotRenew(payload, event, String(paymentEvent.id))
          break

        case 'charge.success':
          await handleChargeSuccess(payload, event, String(paymentEvent.id))
          break

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(payload, event, String(paymentEvent.id))
          break

        default:
          console.log(`Unhandled event type: ${event.event}`)
          // Mark as processed even if we don't handle it
          await payload.update({
            collection: 'payment-events',
            id: String(paymentEvent.id),
            data: {
              processed: true,
              processed_at: new Date().toISOString(),
            },
          })
      }

      return Response.json({ success: true }, { status: 200 })
    } catch (error: any) {
      console.error('Error processing webhook event:', error)

      // Update payment event with error
      await payload.update({
        collection: 'payment-events',
        id: String(paymentEvent.id),
        data: {
          processed: false,
          error_message: error.message,
        },
      })

      // Still return 200 to prevent Paystack from retrying
      return Response.json({ success: false, error: error.message }, { status: 200 })
    }
  } catch (error: any) {
    console.error('Error handling webhook:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle subscription.create event
 */
async function handleSubscriptionCreate(payload: any, event: any, eventId: string) {
  const data = event.data
  const userId = data.metadata?.user_id
  const planId = data.metadata?.plan_id

  if (!userId || !planId) {
    throw new Error('Missing user_id or plan_id in metadata')
  }

  // Create or update subscription
  const existingSubscriptions = await payload.find({
    collection: 'user-subscriptions',
    where: {
      paystack_subscription_code: {
        equals: data.subscription_code,
      },
    },
  })

  let subscription

  if (existingSubscriptions.docs.length > 0) {
    // Update existing
    subscription = await payload.update({
      collection: 'user-subscriptions',
      id: existingSubscriptions.docs[0].id,
      data: {
        status: 'active',
        paystack_customer_code: data.customer.customer_code,
        paystack_authorization_code: data.authorization.authorization_code,
        paystack_email_token: data.email_token,
        current_period_start: data.created_at,
        current_period_end: data.next_payment_date,
        next_payment_date: data.next_payment_date,
        last4: data.authorization.last4,
        card_type: data.authorization.card_type,
        card_bank: data.authorization.bank,
      },
    })
  } else {
    // Create new
    subscription = await payload.create({
      collection: 'user-subscriptions',
      data: {
        user: String(userId),
        plan: planId,
        paystack_subscription_code: data.subscription_code,
        paystack_customer_code: data.customer.customer_code,
        paystack_authorization_code: data.authorization.authorization_code,
        paystack_email_token: data.email_token,
        status: 'active',
        current_period_start: data.created_at,
        current_period_end: data.next_payment_date,
        next_payment_date: data.next_payment_date,
        last4: data.authorization.last4,
        card_type: data.authorization.card_type,
        card_bank: data.authorization.bank,
      },
    })
  }

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: String(userId),
      subscription: subscription.id,
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}

/**
 * Handle subscription.disable event
 */
async function handleSubscriptionDisable(payload: any, event: any, eventId: string) {
  const data = event.data

  // Find subscription
  const subscriptions = await payload.find({
    collection: 'user-subscriptions',
    where: {
      paystack_subscription_code: {
        equals: data.subscription_code,
      },
    },
  })

  if (subscriptions.docs.length === 0) {
    throw new Error(`Subscription not found: ${data.subscription_code}`)
  }

  const subscription = subscriptions.docs[0]

  // Update subscription
  await payload.update({
    collection: 'user-subscriptions',
    id: subscription.id,
    data: {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    },
  })

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: subscription.user,
      subscription: subscription.id,
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}

/**
 * Handle subscription.not_renew event
 */
async function handleSubscriptionNotRenew(payload: any, event: any, eventId: string) {
  const data = event.data

  // Find subscription
  const subscriptions = await payload.find({
    collection: 'user-subscriptions',
    where: {
      paystack_subscription_code: {
        equals: data.subscription_code,
      },
    },
  })

  if (subscriptions.docs.length === 0) {
    throw new Error(`Subscription not found: ${data.subscription_code}`)
  }

  const subscription = subscriptions.docs[0]

  // Update subscription
  await payload.update({
    collection: 'user-subscriptions',
    id: subscription.id,
    data: {
      status: 'non-renewing',
    },
  })

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: subscription.user,
      subscription: subscription.id,
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}

/**
 * Handle charge.success event
 * This can be for subscription payments, superchat charges, or payment method setup
 */
async function handleChargeSuccess(payload: any, event: any, eventId: string) {
  const data = event.data
  const metadata = data.metadata || {}

  // Determine the purpose of the charge
  if (metadata.purpose === 'payment_method_setup') {
    // Payment method setup - save authorization code
    await handlePaymentMethodSetup(payload, event, eventId)
  } else if (metadata.purpose === 'superchat') {
    // Superchat charge - already handled in send endpoint
    // Just log the transaction
    await payload.update({
      collection: 'payment-events',
      id: eventId,
      data: {
        user: String(metadata.user_id),
        processed: true,
        processed_at: new Date().toISOString(),
      },
    })
  } else {
    // Subscription payment - log transaction
    await handleSubscriptionPayment(payload, event, eventId)
  }
}

/**
 * Handle payment method setup
 */
async function handlePaymentMethodSetup(payload: any, event: any, eventId: string) {
  const data = event.data
  const userId = data.metadata?.user_id

  if (!userId) {
    throw new Error('Missing user_id in metadata')
  }

  const authorization = data.authorization

  // Check if authorization already exists
  const existingMethods = await payload.find({
    collection: 'user-payment-methods',
    where: {
      authorization_code: {
        equals: authorization.authorization_code,
      },
    },
  })

  if (existingMethods.docs.length > 0) {
    // Already exists, just update
    await payload.update({
      collection: 'user-payment-methods',
      id: existingMethods.docs[0].id,
      data: {
        is_active: true,
      },
    })
  } else {
    // Check if user has any payment methods
    const userMethods = await payload.find({
      collection: 'user-payment-methods',
      where: {
        user: {
          equals: String(userId),
        },
      },
    })

    // Create new payment method (first one is default)
    await payload.create({
      collection: 'user-payment-methods',
      data: {
        user: String(userId),
        authorization_code: authorization.authorization_code,
        last4: authorization.last4,
        exp_month: authorization.exp_month,
        exp_year: authorization.exp_year,
        card_type: authorization.card_type,
        bank: authorization.bank,
        brand: authorization.brand,
        is_default: userMethods.docs.length === 0, // First payment method is default
        is_active: true,
      },
    })
  }

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: String(userId),
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}

/**
 * Handle subscription payment
 */
async function handleSubscriptionPayment(payload: any, event: any, eventId: string) {
  const data = event.data

  // Find subscription by authorization code or customer code
  const subscriptions = await payload.find({
    collection: 'user-subscriptions',
    where: {
      or: [
        {
          paystack_authorization_code: {
            equals: data.authorization?.authorization_code,
          },
        },
        {
          paystack_customer_code: {
            equals: data.customer?.customer_code,
          },
        },
      ],
    },
  })

  if (subscriptions.docs.length === 0) {
    console.warn('No subscription found for charge, skipping transaction log')
    await payload.update({
      collection: 'payment-events',
      id: eventId,
      data: {
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: 'No subscription found for charge',
      },
    })
    return
  }

  const subscription = subscriptions.docs[0]

  // Create transaction record
  await payload.create({
    collection: 'subscription-transactions',
    data: {
      subscription: subscription.id,
      user: subscription.user,
      transaction_reference: data.reference,
      amount: data.amount,
      status: 'success',
      paystack_transaction_id: data.id,
      paystack_response: data,
      gateway_response: data.gateway_response,
      fees: data.fees,
      net_amount: data.amount - (data.fees || 0),
    },
  })

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: subscription.user,
      subscription: subscription.id,
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(payload: any, event: any, eventId: string) {
  const data = event.data

  // Find subscription
  const subscriptions = await payload.find({
    collection: 'user-subscriptions',
    where: {
      paystack_subscription_code: {
        equals: data.subscription_code,
      },
    },
  })

  if (subscriptions.docs.length === 0) {
    throw new Error(`Subscription not found: ${data.subscription_code}`)
  }

  const subscription = subscriptions.docs[0]

  // Create failed transaction record
  await payload.create({
    collection: 'subscription-transactions',
    data: {
      subscription: subscription.id,
      user: subscription.user,
      transaction_reference: data.reference || `FAILED_${Date.now()}`,
      amount: data.amount,
      status: 'failed',
      paystack_response: data,
      gateway_response: data.gateway_response || 'Payment failed',
    },
  })

  // Update payment event
  await payload.update({
    collection: 'payment-events',
    id: eventId,
    data: {
      user: subscription.user,
      subscription: subscription.id,
      processed: true,
      processed_at: new Date().toISOString(),
    },
  })
}
