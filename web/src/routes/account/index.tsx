import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { type DocumentHead, Link } from '@builder.io/qwik-city';
import {
  LuArrowLeft,
  LuCreditCard,
  LuCheck,
  LuX,
  LuCalendar,
  LuDollarSign,
  LuTrash2,
  LuStar,
  LuAlertCircle,
  LuLoader2
} from '@qwikest/icons/lucide';
import { formatCurrency } from '~/utils/currency';

interface Subscription {
  id: string;
  plan: {
    id: string;
    name: string;
    description?: string;
  };
  status: string;
  interval: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  price_amount?: number;
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: string;
  card_exp_year: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
}

export default component$(() => {
  // State
  const subscription = useSignal<Subscription | null>(null);
  const paymentMethods = useSignal<PaymentMethod[]>([]);
  const isLoading = useSignal(true);
  const error = useSignal('');
  const isAuthenticated = useSignal<boolean | null>(null);

  // Cancel subscription state
  const showCancelModal = useSignal(false);
  const isCancelling = useSignal(false);
  const cancelError = useSignal('');

  // Payment method actions state
  const deletingMethodId = useSignal<string | null>(null);
  const settingDefaultId = useSignal<string | null>(null);

  // Load account data
  useVisibleTask$(async () => {
    isLoading.value = true;
    error.value = '';

    try {
      // Check authentication
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        isAuthenticated.value = false;
        isLoading.value = false;
        return;
      }
      isAuthenticated.value = true;

      // Fetch subscription and payment methods in parallel
      const [subResp, pmResp] = await Promise.all([
        fetch('/api/subscriptions/current', {
          credentials: 'include',
        }),
        fetch('/api/superchat/payment-methods', {
          credentials: 'include',
        }),
      ]);

      if (subResp.ok) {
        const subData = await subResp.json();
        subscription.value = subData.subscription || null;
      }

      if (pmResp.ok) {
        const pmData = await pmResp.json();
        paymentMethods.value = pmData.paymentMethods || [];
      }
    } catch (err) {
      error.value = 'Failed to load account information';
    } finally {
      isLoading.value = false;
    }
  });

  // Cancel subscription handler
  const cancelSubscription = $(async () => {
    if (!subscription.value) return;

    isCancelling.value = true;
    cancelError.value = '';

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Update subscription status
      if (subscription.value) {
        subscription.value = {
          ...subscription.value,
          status: 'cancelled',
        };
      }

      showCancelModal.value = false;
    } catch (err) {
      cancelError.value = err instanceof Error ? err.message : 'Failed to cancel subscription';
    } finally {
      isCancelling.value = false;
    }
  });

  // Delete payment method handler
  const deletePaymentMethod = $(async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    deletingMethodId.value = methodId;

    try {
      const response = await fetch(`/api/superchat/payment-methods/${methodId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete payment method');
      }

      // Remove from list
      paymentMethods.value = paymentMethods.value.filter(pm => pm.id !== methodId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete payment method');
    } finally {
      deletingMethodId.value = null;
    }
  });

  // Set default payment method handler
  const setDefaultPaymentMethod = $(async (methodId: string) => {
    settingDefaultId.value = methodId;

    try {
      const response = await fetch('/api/superchat/payment-methods/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to set default payment method');
      }

      // Update list
      paymentMethods.value = paymentMethods.value.map(pm => ({
        ...pm,
        is_default: pm.id === methodId,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set default payment method');
    } finally {
      settingDefaultId.value = null;
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
            Please sign in to view your account and manage your subscriptions.
          </p>
          <a
            href="/auth/login?redirect=/account"
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
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <Link
                href="/"
                class="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors mb-2"
              >
                <LuArrowLeft class="w-4 h-4" />
                Back to Home
              </Link>
              <h1 class="text-3xl font-bold text-gray-900">My Account</h1>
              <p class="text-gray-600 mt-1">Manage your subscription and payment methods</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading.value && (
          <div class="flex items-center justify-center py-12">
            <LuLoader2 class="w-8 h-8 animate-spin text-orange-600" />
            <span class="ml-3 text-gray-600">Loading account information...</span>
          </div>
        )}

        {/* Error State */}
        {error.value && !isLoading.value && (
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div class="flex items-start gap-3">
              <LuAlertCircle class="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 class="font-semibold text-red-900">Error Loading Account</h3>
                <p class="text-red-700 text-sm mt-1">{error.value}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading.value && !error.value && (
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Subscription Status */}
            <div class="lg:col-span-2 space-y-6">
              {/* Current Subscription */}
              <div class="bg-white rounded-xl shadow-md p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <LuCalendar class="w-5 h-5 text-orange-600" />
                  Subscription Status
                </h2>

                {subscription.value ? (
                  <div>
                    <div class={`p-4 rounded-lg mb-4 ${
                      subscription.value.status === 'active'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div class="flex items-start justify-between">
                        <div>
                          <h3 class="text-lg font-bold text-gray-900">
                            {subscription.value.plan?.name || 'Premium Plan'}
                          </h3>
                          <p class="text-sm text-gray-600 mt-1">
                            {subscription.value.plan?.description || 'Premium subscription with full access'}
                          </p>
                          <div class="mt-3 space-y-1">
                            <p class="text-sm">
                              <span class="font-medium">Status:</span>{' '}
                              <span class={`font-semibold ${
                                subscription.value.status === 'active' ? 'text-green-700' : 'text-gray-700'
                              }`}>
                                {subscription.value.status.charAt(0).toUpperCase() + subscription.value.status.slice(1)}
                              </span>
                            </p>
                            <p class="text-sm">
                              <span class="font-medium">Billing:</span>{' '}
                              <span class="capitalize">{subscription.value.interval}</span>
                              {subscription.value.price_amount && (
                                <span> • {formatCurrency(subscription.value.price_amount)}</span>
                              )}
                            </p>
                            {subscription.value.current_period_end && (
                              <p class="text-sm">
                                <span class="font-medium">
                                  {subscription.value.status === 'active' ? 'Renews on:' : 'Expires on:'}
                                </span>{' '}
                                {new Date(subscription.value.current_period_end).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        {subscription.value.status === 'active' && (
                          <LuCheck class="w-6 h-6 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div class="flex gap-3">
                      {subscription.value.status === 'active' && (
                        <button
                          type="button"
                          onClick$={() => showCancelModal.value = true}
                          class="px-4 py-2 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-all"
                        >
                          Cancel Subscription
                        </button>
                      )}
                      <Link
                        href="/subscriptions"
                        class="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
                      >
                        {subscription.value.status === 'active' ? 'Change Plan' : 'Resubscribe'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div class="text-center py-8">
                    <LuAlertCircle class="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                    <p class="text-gray-600 mb-4">
                      Subscribe to get unlimited access to premium content
                    </p>
                    <Link
                      href="/subscriptions"
                      class="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
                    >
                      View Subscription Plans
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Payment Methods */}
            <div class="lg:col-span-1">
              <div class="bg-white rounded-xl shadow-md p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <LuCreditCard class="w-5 h-5 text-orange-600" />
                  Payment Methods
                </h2>

                {paymentMethods.value.length > 0 ? (
                  <div class="space-y-3">
                    {paymentMethods.value.map((pm) => (
                      <div
                        key={pm.id}
                        class={`p-4 rounded-lg border-2 ${
                          pm.is_default
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <LuCreditCard class="w-4 h-4 text-gray-600" />
                            <span class="font-semibold text-gray-900">
                              {pm.card_brand.toUpperCase()} •••• {pm.card_last4}
                            </span>
                          </div>
                          {pm.is_default && (
                            <span class="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded">
                              <LuStar class="w-3 h-3" />
                              Default
                            </span>
                          )}
                        </div>
                        <p class="text-sm text-gray-600 mb-3">
                          Expires {pm.card_exp_month}/{pm.card_exp_year}
                        </p>
                        <div class="flex gap-2">
                          {!pm.is_default && (
                            <button
                              type="button"
                              onClick$={() => setDefaultPaymentMethod(pm.id)}
                              disabled={settingDefaultId.value === pm.id}
                              class="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 font-medium rounded hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                              {settingDefaultId.value === pm.id ? 'Setting...' : 'Set as Default'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick$={() => deletePaymentMethod(pm.id)}
                            disabled={deletingMethodId.value === pm.id}
                            class="text-xs px-3 py-1.5 border border-red-300 text-red-700 font-medium rounded hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {deletingMethodId.value === pm.id ? (
                              <>
                                <LuLoader2 class="w-3 h-3 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>
                                <LuTrash2 class="w-3 h-3" />
                                Remove
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    <Link
                      href="/account/payment-methods/add"
                      class="block w-full text-center px-4 py-3 border-2 border-dashed border-orange-300 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 transition-all"
                    >
                      + Add Payment Method
                    </Link>
                  </div>
                ) : (
                  <div class="text-center py-6">
                    <LuCreditCard class="w-10 h-10 mx-auto mb-3 text-gray-400" />
                    <p class="text-sm text-gray-600 mb-4">
                      No payment methods saved
                    </p>
                    <Link
                      href="/account/payment-methods/add"
                      class="inline-block px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
                    >
                      Add Payment Method
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal.value && (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Cancel Subscription?</h3>
            <p class="text-gray-600 mb-4">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
            </p>

            {cancelError.value && (
              <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {cancelError.value}
              </div>
            )}

            <div class="flex gap-3">
              <button
                type="button"
                onClick$={() => {
                  showCancelModal.value = false;
                  cancelError.value = '';
                }}
                disabled={isCancelling.value}
                class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick$={cancelSubscription}
                disabled={isCancelling.value}
                class="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling.value ? (
                  <>
                    <LuLoader2 class="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'My Account - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Manage your subscription and payment methods',
    },
  ],
};
