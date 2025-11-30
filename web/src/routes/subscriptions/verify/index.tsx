import { component$, useVisibleTask$, useSignal } from '@builder.io/qwik';
import { useLocation, type DocumentHead, Link } from '@builder.io/qwik-city';
import { LuCheckCircle, LuXCircle, LuLoader2, LuArrowRight } from '@qwikest/icons/lucide';

export default component$(() => {
  const location = useLocation();
  const status = useSignal<'verifying' | 'success' | 'error'>('verifying');
  const message = useSignal('Verifying your subscription...');
  const subscriptionDetails = useSignal<any>(null);

  // Verify subscription on mount
  useVisibleTask$(async () => {
    // Get reference from URL query params
    const reference = location.url.searchParams.get('reference');
    const trxref = location.url.searchParams.get('trxref');
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      status.value = 'error';
      message.value = 'No payment reference found. Please try subscribing again.';
      return;
    }

    try {
      // The webhook should have already processed this payment
      // We just need to check the subscription status
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for webhook processing

      const response = await fetch('/api/subscriptions/current', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.subscription && data.subscription.status === 'active') {
          status.value = 'success';
          message.value = 'Your subscription is now active!';
          subscriptionDetails.value = data.subscription;

          // Redirect to home after 3 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          // Payment might still be processing
          status.value = 'verifying';
          message.value = 'Payment is being processed. This may take a few moments...';

          // Check again after 5 seconds
          setTimeout(async () => {
            const retryResponse = await fetch('/api/subscriptions/current', {
              credentials: 'include',
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (retryData.subscription && retryData.subscription.status === 'active') {
                status.value = 'success';
                message.value = 'Your subscription is now active!';
                subscriptionDetails.value = retryData.subscription;
                setTimeout(() => {
                  window.location.href = '/';
                }, 3000);
              } else {
                status.value = 'error';
                message.value = 'Subscription verification is taking longer than expected. Please check your account or contact support.';
              }
            } else {
              status.value = 'error';
              message.value = 'Failed to verify subscription. Please check your account or contact support.';
            }
          }, 5000);
        }
      } else {
        status.value = 'error';
        message.value = 'Failed to verify subscription. Please contact support if you were charged.';
      }
    } catch (err) {
      console.error('[Subscription Verify] Error:', err);
      status.value = 'error';
      message.value = 'An error occurred while verifying your subscription. Please contact support.';
    }
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div class="mb-6 flex justify-center">
          {status.value === 'verifying' && (
            <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <LuLoader2 class="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}
          {status.value === 'success' && (
            <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <LuCheckCircle class="w-10 h-10 text-green-600" />
            </div>
          )}
          {status.value === 'error' && (
            <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <LuXCircle class="w-10 h-10 text-red-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          {status.value === 'verifying' && 'Verifying Payment'}
          {status.value === 'success' && 'Subscription Activated!'}
          {status.value === 'error' && 'Verification Failed'}
        </h1>

        {/* Message */}
        <p class="text-gray-600 mb-6">{message.value}</p>

        {/* Subscription Details */}
        {status.value === 'success' && subscriptionDetails.value && (
          <div class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200 text-left">
            <div class="text-sm space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Plan:</span>
                <span class="font-semibold text-gray-900">
                  {subscriptionDetails.value.plan?.name || 'Premium'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Billing:</span>
                <span class="font-semibold text-gray-900 capitalize">
                  {subscriptionDetails.value.interval || 'Monthly'}
                </span>
              </div>
              {subscriptionDetails.value.current_period_end && (
                <div class="flex justify-between">
                  <span class="text-gray-600">Renews:</span>
                  <span class="font-semibold text-gray-900">
                    {new Date(subscriptionDetails.value.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div class="space-y-3">
          {status.value === 'success' && (
            <>
              <p class="text-sm text-gray-500">Redirecting to home page...</p>
              <Link
                href="/"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Go to Home
                <LuArrowRight class="w-4 h-4" />
              </Link>
            </>
          )}

          {status.value === 'error' && (
            <>
              <Link
                href="/subscriptions"
                class="block w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Try Again
              </Link>
              <Link
                href="/contact"
                class="block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Contact Support
              </Link>
            </>
          )}

          {status.value === 'verifying' && (
            <p class="text-sm text-gray-500">Please wait, do not close this page...</p>
          )}
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Verifying Subscription - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Verifying your subscription payment.',
    },
  ],
};
