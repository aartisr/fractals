/**
 * Paystack Webhook Handler
 * POST /api/webhooks/paystack
 *
 * Handles payment notifications from Paystack
 * Documentation: https://paystack.com/docs/payments/webhooks/
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import crypto from 'crypto';

// Paystack event types
type PaystackEvent =
  | 'charge.success'
  | 'charge.failed'
  | 'transfer.success'
  | 'transfer.failed'
  | 'subscription.create'
  | 'subscription.disable'
  | 'subscription.not_renew';

interface PaystackWebhookPayload {
  event: PaystackEvent;
  data: {
    id: number;
    reference: string;
    amount: number; // Amount in kobo (smallest currency unit)
    currency: string;
    status: string;
    paid_at?: string;
    created_at: string;
    channel: string;
    metadata?: {
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
      [key: string]: any;
    };
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name?: string;
      last_name?: string;
    };
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
      channel: string;
      reusable: boolean;
    };
  };
}

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}

/**
 * Process successful payment
 */
async function handleChargeSuccess(
  data: PaystackWebhookPayload['data'],
  cmsApiUrl: string,
  cmsApiKey: string
) {
  console.log('[Paystack Webhook] Processing successful payment:', data.reference);

  // Extract amount in actual currency (convert from kobo)
  const amountInCurrency = data.amount / 100;

  // Extract custom metadata
  const userEmail = data.customer.email;
  const customFields = data.metadata?.custom_fields || [];

  // Find user email or donation purpose from custom fields
  const donationPurpose = customFields.find(
    (field) => field.variable_name === 'donation_purpose'
  )?.value;

  const userId = customFields.find((field) => field.variable_name === 'user_id')?.value;

  // TODO: Store payment record in your CMS
  // You might want to create a Donations collection in Payload CMS
  const donationData = {
    reference: data.reference,
    amount: amountInCurrency,
    currency: data.currency,
    status: data.status,
    paymentMethod: data.channel,
    customerEmail: userEmail,
    customerName: `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim(),
    donationPurpose: donationPurpose || 'General Donation',
    userId: userId || null,
    paystackCustomerId: data.customer.customer_code,
    paidAt: data.paid_at || data.created_at,
    metadata: data.metadata,
  };

  console.log('[Paystack Webhook] Donation data:', donationData);

  // TODO: Uncomment when you create the Donations collection
  /*
  try {
    const response = await fetch(`${cmsApiUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${cmsApiKey}`,
      },
      body: JSON.stringify(donationData),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Paystack Webhook] Failed to save donation:', errText);
      throw new Error(`Failed to save donation: ${errText}`);
    }

    const result = await response.json();
    console.log('[Paystack Webhook] Donation saved:', result.doc.id);
  } catch (err) {
    console.error('[Paystack Webhook] Error saving donation:', err);
    throw err;
  }
  */

  // TODO: Send confirmation email to donor
  // TODO: Update user's donation history
  // TODO: Trigger any post-payment actions (e.g., unlock premium content)

  return donationData;
}

/**
 * Process failed payment
 */
async function handleChargeFailed(data: PaystackWebhookPayload['data']) {
  console.log('[Paystack Webhook] Payment failed:', data.reference);

  // TODO: Log failed payment attempt
  // TODO: Notify user of payment failure
  // TODO: Store failed transaction for retry or analysis

  return {
    reference: data.reference,
    status: 'failed',
    customerEmail: data.customer.email,
  };
}

export const onPost: RequestHandler = async ({ request, env, error, json }) => {
  const paystackSecretKey = env.get('PAYSTACK_SECRET_KEY');
  const cmsApiUrl = env.get('PUBLIC_CMS_API_URL') || 'http://localhost:3000';
  const cmsApiKey = env.get('PAYLOAD_API_KEY');

  if (!paystackSecretKey) {
    console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY not set');
    throw error(500, 'Paystack configuration missing');
  }

  if (!cmsApiKey) {
    console.error('[Paystack Webhook] PAYLOAD_API_KEY not set');
    throw error(500, 'CMS API not configured');
  }

  try {
    // Get the raw body as text for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('[Paystack Webhook] Missing signature header');
      throw error(400, 'Missing Paystack signature');
    }

    // Verify webhook signature
    const isValid = verifyPaystackSignature(rawBody, signature, paystackSecretKey);

    if (!isValid) {
      console.error('[Paystack Webhook] Invalid signature');
      throw error(401, 'Invalid webhook signature');
    }

    // Parse the payload
    const payload: PaystackWebhookPayload = JSON.parse(rawBody);

    console.log('[Paystack Webhook] Received event:', payload.event);

    // Handle different event types
    let result;

    switch (payload.event) {
      case 'charge.success':
        result = await handleChargeSuccess(payload.data, cmsApiUrl, cmsApiKey);
        break;

      case 'charge.failed':
        result = await handleChargeFailed(payload.data);
        break;

      case 'subscription.create':
        console.log('[Paystack Webhook] Subscription created:', payload.data.reference);
        // TODO: Handle subscription creation
        result = { event: 'subscription.create', processed: true };
        break;

      case 'subscription.disable':
        console.log('[Paystack Webhook] Subscription disabled:', payload.data.reference);
        // TODO: Handle subscription cancellation
        result = { event: 'subscription.disable', processed: true };
        break;

      case 'transfer.success':
      case 'transfer.failed':
        console.log('[Paystack Webhook] Transfer event:', payload.event);
        // TODO: Handle transfer events if needed
        result = { event: payload.event, processed: true };
        break;

      default:
        console.log('[Paystack Webhook] Unhandled event type:', payload.event);
        result = { event: payload.event, processed: false, message: 'Event type not handled' };
    }

    // Always return 200 to acknowledge receipt
    json(200, {
      success: true,
      event: payload.event,
      reference: payload.data.reference,
      result,
    });
  } catch (err) {
    console.error('[Paystack Webhook] Error processing webhook:', err);

    // Log error but still return 200 to prevent Paystack from retrying
    // (since the error is likely permanent, not transient)
    if (err instanceof Response) {
      throw err;
    }

    // Return 200 with error logged to prevent retries for permanent errors
    json(200, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      message: 'Webhook received but processing failed',
    });
  }
};
