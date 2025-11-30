import { component$, useVisibleTask$, useSignal } from '@builder.io/qwik';
import { useLocation, type DocumentHead, Link } from '@builder.io/qwik-city';
import { LuCheckCircle, LuXCircle, LuLoader2, LuArrowRight } from '@qwikest/icons/lucide';

export default component$(() => {
  const location = useLocation();
  const status = useSignal<'verifying' | 'success' | 'error'>('verifying');
  const message = useSignal('Verifying your payment method...');

  // Verify payment method setup on mount
  useVisibleTask$(async () => {
    // Get reference from URL query params
    const reference = location.url.searchParams.get('reference');
    const trxref = location.url.searchParams.get('trxref');
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      status.value = 'error';
      message.value = 'No payment reference found. Please try again.';
      return;
    }

    try {
      // The webhook should have already processed this payment
      // We just need to verify it was successful
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for webhook processing

      // Verify the transaction with Paystack
      const response = await fetch(`/api/superchat/verify-setup?reference=${paymentRef}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          status.value = 'success';
          message.value = 'Payment method added successfully!';

          // Redirect to account page after 3 seconds
          setTimeout(() => {
            window.location.href = '/account';
          }, 3000);
        } else {
          status.value = 'error';
          message.value = data.error || 'Failed to verify payment method setup.';
        }
      } else {
        const errorData = await response.json();
        status.value = 'error';
        message.value = errorData.error || 'Failed to verify payment method. Please contact support.';
      }
    } catch (err) {
      status.value = 'error';
      message.value = 'An error occurred while verifying your payment method. Please contact support.';
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
          {status.value === 'verifying' && 'Verifying Payment Method'}
          {status.value === 'success' && 'Payment Method Added!'}
          {status.value === 'error' && 'Verification Failed'}
        </h1>

        {/* Message */}
        <p class="text-gray-600 mb-6">{message.value}</p>

        {/* Actions */}
        <div class="space-y-3">
          {status.value === 'success' && (
            <>
              <p class="text-sm text-gray-500">Redirecting to your account...</p>
              <Link
                href="/account"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
              >
                Go to Account
                <LuArrowRight class="w-4 h-4" />
              </Link>
            </>
          )}

          {status.value === 'error' && (
            <>
              <Link
                href="/account/payment-methods/add"
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
  title: 'Verifying Payment Method - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Verifying your payment method setup.',
    },
  ],
};
