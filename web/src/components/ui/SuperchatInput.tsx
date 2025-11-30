import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { LuDollarSign, LuSend, LuLoader2 } from '@qwikest/icons/lucide';
import { formatCurrency } from '~/utils/currency';

interface SuperchatTier {
  tier_id: string;
  name: string;
  color: string;
  min_amount: number;
  pin_duration: number;
  is_active: boolean;
  display_order: number;
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: string;
  card_exp_year: string;
  is_default: boolean;
  is_active: boolean;
}

interface SuperchatInputProps {
  streamId: string;
}

export const SuperchatInput = component$<SuperchatInputProps>(({ streamId }) => {
  // State
  const tiers = useSignal<SuperchatTier[]>([]);
  const paymentMethods = useSignal<PaymentMethod[]>([]);
  const selectedAmount = useSignal(500); // Default $5.00
  const message = useSignal('');
  const selectedPaymentMethodId = useSignal<string | undefined>(undefined);
  const isLoading = useSignal(false);
  const isLoadingData = useSignal(true);
  const error = useSignal('');
  const success = useSignal(false);
  const isAuthenticated = useSignal<boolean | null>(null);

  // Preset amounts (in cents)
  const presetAmounts = [100, 500, 1000, 2500, 5000, 10000]; // $1, $5, $10, $25, $50, $100

  // Get tier color based on amount
  const getCurrentTierColor = $(() => {
    const amount = selectedAmount.value;
    // Find the tier for this amount (highest tier that amount qualifies for)
    const applicableTiers = tiers.value
      .filter((t) => amount >= t.min_amount)
      .sort((a, b) => b.min_amount - a.min_amount);

    return applicableTiers[0]?.color || '#2196F3'; // Default to blue
  });

  const currentTierColor = useSignal('#2196F3');

  // Update tier color when amount changes
  useVisibleTask$(({ track }) => {
    track(() => selectedAmount.value);
    getCurrentTierColor().then((color) => {
      currentTierColor.value = color;
    });
  });

  // Load tiers and payment methods on mount
  useVisibleTask$(async () => {
    if (!streamId) return;

    isLoadingData.value = true;
    error.value = '';

    try {
      // Check authentication
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        isAuthenticated.value = false;
        isLoadingData.value = false;
        return;
      }
      isAuthenticated.value = true;

      // Fetch tiers
      const tiersResp = await fetch('/api/superchat/tiers');
      if (tiersResp.ok) {
        const tiersData = await tiersResp.json();
        tiers.value = tiersData.tiers || [];
      }

      // Fetch payment methods
      const pmResp = await fetch('/api/superchat/payment-methods', {
        credentials: 'include',
      });
      if (pmResp.ok) {
        const pmData = await pmResp.json();
        paymentMethods.value = pmData.paymentMethods || [];

        // Select default payment method
        const defaultPm = pmData.paymentMethods?.find((pm: PaymentMethod) => pm.is_default);
        if (defaultPm) {
          selectedPaymentMethodId.value = defaultPm.id;
        } else if (pmData.paymentMethods?.length > 0) {
          selectedPaymentMethodId.value = pmData.paymentMethods[0].id;
        }
      }
    } catch (err) {
      error.value = 'Failed to load superchat configuration';
    } finally {
      isLoadingData.value = false;
    }
  });

  // Send superchat handler
  const sendSuperchat = $(async () => {
    if (!message.value.trim() || isLoading.value || !isAuthenticated.value) return;

    // Validate
    if (message.value.length > 500) {
      error.value = 'Message must be 500 characters or less';
      return;
    }

    if (selectedAmount.value < 100) {
      error.value = 'Minimum amount is $1.00';
      return;
    }

    // Check if user needs to add payment method
    if (paymentMethods.value.length === 0) {
      error.value = 'Please add a payment method first';
      return;
    }

    isLoading.value = true;
    error.value = '';
    success.value = false;

    try {
      const response = await fetch('/api/superchat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          streamId,
          message: message.value.trim(),
          amount: selectedAmount.value,
          paymentMethodId: selectedPaymentMethodId.value,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401 || response.status === 403) {
          isAuthenticated.value = false;
          error.value = 'Your session has expired. Please sign in again.';
          return;
        }
        throw new Error(data.error || 'Failed to send superchat');
      }

      // Success!
      success.value = true;
      message.value = '';

      // Reset success message after 3 seconds
      setTimeout(() => {
        success.value = false;
      }, 3000);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send superchat';
    } finally {
      isLoading.value = false;
    }
  });

  // Show loading state
  if (isLoadingData.value) {
    return (
      <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-6">
        <div class="flex items-center justify-center gap-2 text-gray-500">
          <LuLoader2 class="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show sign-in message for guests
  if (isAuthenticated.value === false) {
    return (
      <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-6">
        <div class="text-center">
          <LuDollarSign class="w-12 h-12 mx-auto mb-3 text-orange-600" />
          <h3 class="text-lg font-bold text-gray-900 mb-2">Send Super Chat</h3>
          <p class="text-sm text-gray-600 mb-4">
            Support the stream by sending a highlighted message
          </p>
          <a
            href="/auth/login"
            class="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
          >
            Sign in to send Super Chat
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-4">
      {/* Header */}
      <div class="flex items-center gap-2 mb-4">
        <LuDollarSign class="w-6 h-6 text-orange-600" />
        <h3 class="text-lg font-bold text-gray-900">Send Super Chat</h3>
      </div>

      {/* Success Message */}
      {success.value && (
        <div class="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <strong>Super Chat sent!</strong> Your message will appear in the chat shortly.
        </div>
      )}

      {/* Error Message */}
      {error.value && (
        <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error.value}
        </div>
      )}

      {/* Amount Selector */}
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Select Amount</label>
        <div class="grid grid-cols-3 gap-2">
          {presetAmounts.map((amount) => {
            const tierColor = tiers.value
              .filter((t) => amount >= t.min_amount)
              .sort((a, b) => b.min_amount - a.min_amount)[0]?.color || '#2196F3';

            return (
              <button
                key={amount}
                type="button"
                onClick$={() => (selectedAmount.value = amount)}
                class={`px-3 py-2 rounded-lg font-semibold transition-all ${
                  selectedAmount.value === amount
                    ? 'ring-2 ring-offset-2 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: tierColor,
                  color: 'white',
                  borderColor: tierColor,
                }}
              >
                {formatCurrency(amount)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Your Message</label>
          <span class="text-xs text-gray-500">
            {message.value.length}/500
          </span>
        </div>
        <textarea
          class="w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{
            borderColor: currentTierColor.value,
          }}
          rows={3}
          maxLength={500}
          placeholder="Write your message..."
          bind:value={message}
          disabled={isLoading.value}
        />
      </div>

      {/* Message Preview */}
      {message.value.trim() && (
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div
            class="border-2 rounded-lg overflow-hidden"
            style={{ borderColor: currentTierColor.value }}
          >
            <div
              class="px-3 py-2 text-white font-bold flex items-center justify-between text-sm"
              style={{ backgroundColor: currentTierColor.value }}
            >
              <span>Your Name</span>
              <span>{formatCurrency(selectedAmount.value)}</span>
            </div>
            <div class="bg-white px-3 py-2 text-gray-900 text-sm">
              {message.value}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selector */}
      {paymentMethods.value.length > 0 && (
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <select
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            bind:value={selectedPaymentMethodId}
            disabled={isLoading.value}
          >
            {paymentMethods.value.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {`${pm.card_brand.toUpperCase()} •••• ${pm.card_last4} (${pm.card_exp_month}/${pm.card_exp_year})${pm.is_default ? ' (Default)' : ''}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add Payment Method Link */}
      {paymentMethods.value.length === 0 && (
        <div class="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          You need to add a payment method before sending Super Chats.{' '}
          <a href="/account/payment-methods/add" class="font-semibold underline">
            Add payment method
          </a>
        </div>
      )}

      {/* Send Button */}
      <button
        type="button"
        onClick$={sendSuperchat}
        disabled={
          isLoading.value ||
          !message.value.trim() ||
          paymentMethods.value.length === 0 ||
          message.value.length > 500
        }
        class="w-full px-4 py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          backgroundColor: currentTierColor.value,
          color: 'white',
        }}
      >
        {isLoading.value ? (
          <>
            <LuLoader2 class="w-5 h-5 animate-spin" />
            <span>Sending...</span>
          </>
        ) : (
          <>
            <LuSend class="w-5 h-5" />
            <span>Send {formatCurrency(selectedAmount.value)} Super Chat</span>
          </>
        )}
      </button>

      <p class="mt-3 text-xs text-gray-500 text-center">
        Your Super Chat will appear in the live chat with special highlighting
      </p>
    </div>
  );
});
