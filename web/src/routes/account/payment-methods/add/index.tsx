import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { type DocumentHead, Link } from '@builder.io/qwik-city';
import { LuArrowLeft, LuCreditCard, LuLoader2, LuAlertCircle, LuCheckCircle } from '@qwikest/icons/lucide';

export default component$(() => {
  const isLoading = useSignal(false);
  const error = useSignal('');
  const isAuthenticated = useSignal<boolean | null>(null);
  const userEmail = useSignal('');

  // Check authentication and get user email
  useVisibleTask$(async () => {
    try {
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        isAuthenticated.value = false;
        return;
      }

      const meData = await meResp.json();
      isAuthenticated.value = true;
      userEmail.value = meData.user?.email || '';
    } catch (err) {
      isAuthenticated.value = false;
    }
  });

  // Setup payment method handler
  const setupPaymentMethod = $(async () => {
    isLoading.value = true;
    error.value = '';

    try {
      const response = await fetch('/api/superchat/setup-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: userEmail.value,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment setup');
      }

      // Redirect to Paystack
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to setup payment method';
      isLoading.value = false;
    }
  });

  // Show sign-in message for guests
  if (isAuthenticated.value === false) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <LuAlertCircle class="w-16 h-16 mx-auto mb-4 text-orange-600" />
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p class="text-gray-600 mb-6">
            Please sign in to add a payment method.
          </p>
          <a
            href="/auth/login?redirect=/account/payment-methods/add"
            class="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div class="bg-white border-b border-orange-100">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/account"
            class="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors mb-2"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to Account
          </Link>
          <h1 class="text-3xl font-bold text-gray-900">Add Payment Method</h1>
          <p class="text-gray-600 mt-1">Add a card to send Super Chats and subscribe to premium plans</p>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white rounded-xl shadow-md p-8">
          {/* Icon */}
          <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
            <LuCreditCard class="w-8 h-8 text-orange-600" />
          </div>

          {/* Title */}
          <h2 class="text-2xl font-bold text-gray-900 text-center mb-3">
            Secure Payment Setup
          </h2>
          <p class="text-gray-600 text-center mb-8">
            You'll be redirected to Paystack to securely save your payment information.
            No charge will be made at this time.
          </p>

          {/* Error Message */}
          {error.value && (
            <div class="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start gap-3">
                <LuAlertCircle class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 class="font-semibold text-red-900">Error</h3>
                  <p class="text-red-700 text-sm mt-1">{error.value}</p>
                </div>
              </div>
            </div>
          )}

          {/* How it Works */}
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h3 class="font-bold text-gray-900 mb-4">How it works:</h3>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <p class="text-sm text-gray-700">
                  Click "Continue to Payment Setup" below
                </p>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <p class="text-sm text-gray-700">
                  Enter your card details on Paystack's secure page
                </p>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <p class="text-sm text-gray-700">
                  A small authorization charge (₦50) will be made and immediately refunded
                </p>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  4
                </div>
                <p class="text-sm text-gray-700">
                  Your card will be saved for future Super Chats and subscriptions
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div class="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-8">
            <LuCheckCircle class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 class="font-semibold text-green-900 text-sm">Secure & Safe</h4>
              <p class="text-green-700 text-sm mt-1">
                Your payment information is processed securely by Paystack and is never stored on our servers.
                All transactions are encrypted and PCI-DSS compliant.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div class="flex flex-col sm:flex-row gap-3">
            <Link
              href="/account"
              class="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all text-center"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick$={setupPaymentMethod}
              disabled={isLoading.value || !userEmail.value}
              class="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading.value ? (
                <>
                  <LuLoader2 class="w-5 h-5 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <LuCreditCard class="w-5 h-5" />
                  Continue to Payment Setup
                </>
              )}
            </button>
          </div>

          {/* Additional Info */}
          <p class="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            You can remove this payment method at any time from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Add Payment Method - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Add a payment method to your account',
    },
  ],
};
