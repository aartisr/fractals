/**
 * Subscription Callback Route
 *
 * This route handles the redirect from Paystack after a user completes payment.
 * Paystack redirects here with a reference query parameter.
 *
 * Flow:
 * 1. User completes payment on Paystack
 * 2. Paystack redirects to this route with ?reference=xxx
 * 3. We verify the transaction with Paystack
 * 4. Webhook will handle creating the subscription record
 * 5. We redirect user to their account page
 */

import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { LuCheckCircle, LuLoader2, LuXCircle } from '@qwikest/icons/lucide';

interface VerificationResult {
  success: boolean;
  message: string;
  reference?: string;
  status?: string;
  metadata?: any;
}

/**
 * Server-side verification of payment
 */
export const useVerificationLoader = routeLoader$<VerificationResult>(async ({ query, request }) => {
  const reference = query.get('reference');

  if (!reference) {
    return {
      success: false,
      message: 'No payment reference provided',
    };
  }

  try {
    console.log('[Subscription Callback] Verifying payment reference:', reference);

    // Get the origin from the request
    const origin = new URL(request.url).origin;
    
    // Verify transaction via web app API endpoint
    const verifyResponse = await fetch(
      `${origin}/api/subscriptions/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('[Subscription Callback] Verification response:', verifyData);

    if (verifyData.success && verifyData.status === 'success') {
      // Payment successful - trigger subscription creation via webhook
      const metadata = verifyData.metadata || {}
      
      if (metadata.user_id && metadata.plan_id) {
        try {
          console.log('[Subscription Callback] Creating subscription via webhook with metadata:', metadata);
          
          const webhookResponse = await fetch(
            `${origin}/api/subscriptions/webhook`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reference,
                user_id: metadata.user_id,
                plan_id: metadata.plan_id,
              }),
            }
          )
          
          const webhookData = await webhookResponse.json()
          console.log('[Subscription Callback] Webhook response:', webhookData)
        } catch (webhookError) {
          console.error('[Subscription Callback] Webhook error:', webhookError)
          // Don't fail the flow if webhook fails - subscription might have been created
        }
      } else {
        console.warn('[Subscription Callback] Missing metadata.user_id or metadata.plan_id')
      }

      return {
        success: true,
        message: 'Payment successful! Your subscription is being activated...',
        reference,
        status: 'success',
        metadata,
      };
    } else {
      return {
        success: false,
        message: verifyData.message || 'Payment verification failed. Please contact support.',
        reference,
        status: verifyData.status,
      };
    }
  } catch (error) {
    console.error('[Subscription Callback] Verification error:', error);
    return {
      success: false,
      message: 'An error occurred while verifying your payment',
      reference,
    };
  }
});

export default component$(() => {
  const verification = useVerificationLoader();

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {verification.value.success ? (
          <>
            {/* Success State */}
            <div class="text-center">
              <div class="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <LuCheckCircle class="w-10 h-10 text-green-600" />
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p class="text-gray-600 mb-6">
                {verification.value.message}
              </p>
              <div class="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                <LuLoader2 class="w-4 h-4 animate-spin" />
                <span>Activating your subscription...</span>
              </div>
              <p class="text-xs text-gray-400 mb-4">
                Reference: {verification.value.reference}
              </p>
              <a
                href="/subscriptions"
                class="inline-block w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Go to Account
              </a>
              <p class="text-xs text-gray-500 mt-4">
                You will be redirected automatically in a few seconds...
              </p>
              
              {/* Auto-redirect script */}
              <script dangerouslySetInnerHTML={`setTimeout(function() { window.location.href = '/subscriptions'; }, 3000);`} />
            </div>
          </>
        ) : (
          <>
            {/* Error State */}
            <div class="text-center">
              <div class="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <LuXCircle class="w-10 h-10 text-red-600" />
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
              <p class="text-gray-600 mb-6">
                {verification.value.message}
              </p>
              {verification.value.reference && (
                <p class="text-xs text-gray-400 mb-4">
                  Reference: {verification.value.reference}
                </p>
              )}
              <div class="space-y-3">
                <a
                  href="/subscriptions"
                  class="block w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Try Again
                </a>
                <a
                  href="/"
                  class="block w-full px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Back to Home
                </a>
              </div>
              <p class="text-xs text-gray-500 mt-6">
                If you were charged and still see this error, please contact support with your payment reference.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Payment Processing - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Processing your subscription payment',
    },
  ],
};
