import { component$, useSignal, $ } from '@builder.io/qwik';
import { LuCreditCard, LuLoader2, LuX } from '@qwikest/icons/lucide';

interface PaymentMethodSetupProps {
  isOpen: boolean;
  onClose$: () => void;
  onSuccess$: () => void;
}

export const PaymentMethodSetup = component$<PaymentMethodSetupProps>(({
  isOpen,
  onClose$,
  onSuccess$,
}) => {
  const isLoading = useSignal(false);
  const error = useSignal('');

  const setupPaymentMethod = $(async () => {
    isLoading.value = true;
    error.value = '';

    try {
      // Get user email
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        throw new Error('Please sign in to add a payment method');
      }
      const meData = await meResp.json();
      const userEmail = meData.user?.email;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Call setup-payment endpoint (proxied through web app)
      const response = await fetch('/api/superchat/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment setup');
      }

      // Redirect to Paystack authorization page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('[PaymentMethodSetup] Setup failed:', err);
      error.value = err instanceof Error ? err.message : 'Failed to setup payment method';
      isLoading.value = false;
    }
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick$={onClose$}
      />

      {/* Modal */}
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          {/* Header */}
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <LuCreditCard class="w-6 h-6 text-orange-600" />
              <h2 class="text-xl font-bold text-gray-900">Add Payment Method</h2>
            </div>
            <button
              type="button"
              onClick$={onClose$}
              class="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading.value}
            >
              <LuX class="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div class="mb-6">
            <p class="text-sm text-gray-600 mb-4">
              To send Super Chats, you need to add a payment method. You'll be redirected to
              Paystack to securely save your card details.
            </p>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>What happens next:</strong>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>You'll be redirected to Paystack (secure payment provider)</li>
                <li>Enter your card details on their secure page</li>
                <li>A small authorization charge (NGN 50) will be made</li>
                <li>Your card will be saved for future Super Chats</li>
                <li>You'll be redirected back to continue</li>
              </ul>
            </div>
          </div>

          {/* Error */}
          {error.value && (
            <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error.value}
            </div>
          )}

          {/* Actions */}
          <div class="flex gap-3">
            <button
              type="button"
              onClick$={onClose$}
              disabled={isLoading.value}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick$={setupPaymentMethod}
              disabled={isLoading.value}
              class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading.value ? (
                <>
                  <LuLoader2 class="w-5 h-5 animate-spin" />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <LuCreditCard class="w-5 h-5" />
                  <span>Continue to Paystack</span>
                </>
              )}
            </button>
          </div>

          <p class="mt-4 text-xs text-gray-500 text-center">
            Your payment information is processed securely by Paystack and never stored on our
            servers.
          </p>
        </div>
      </div>
    </>
  );
});
