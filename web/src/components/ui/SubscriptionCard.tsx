import { component$, useSignal, $ } from '@builder.io/qwik';
import { LuCheck, LuLoader2, LuCrown } from '@qwikest/icons/lucide';
import { formatCurrency } from '~/utils/currency';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly?: number;
  amount?: number; // fallback single price (in cents)
  interval?: 'monthly';
  features: string[];
  is_active: boolean;
  display_order: number;
}

interface CurrentSubscription {
  id: string;
  plan: {
    id: string;
    name: string;
  };
  status: string;
  interval: 'monthly' | 'yearly';
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  currentSubscription?: CurrentSubscription | null;
}

export const SubscriptionCard = component$<SubscriptionCardProps>(({ plan, currentSubscription }) => {
  const isLoading = useSignal(false);
  const error = useSignal('');

  const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
  const isActive = currentSubscription?.status === 'active';

  // Resolve monthly price (single-interval UI)
  const price = plan.price_monthly ?? plan.amount ?? 0;
  const hasPrice = price > 0;

  const subscribe = $(async () => {
    isLoading.value = true;
    error.value = '';

    try {
      // Check authentication
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        // Redirect to login with plan ID so we can auto-subscribe after login
        window.location.href = `/auth/login?redirect=/subscriptions&planId=${plan.id}`;
        return;
      }

      // Call create subscription endpoint (proxied through web app)
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: plan.id,
          interval: 'monthly',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Redirect to Paystack authorization page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('[SubscriptionCard] Subscribe failed:', err);
      error.value = err instanceof Error ? err.message : 'Failed to start subscription';
      isLoading.value = false;
    }
  });

  // Determine if this is a featured/recommended plan
  const isFeatured = plan.display_order === 2; // Middle plan is typically featured

  return (
    <div
      class={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
        isFeatured ? 'ring-4 ring-orange-500 scale-105' : 'ring-1 ring-gray-200'
      }`}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div class="absolute top-0 right-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-1 text-xs font-bold uppercase rounded-bl-lg">
          <div class="flex items-center gap-1">
            <LuCrown class="w-3 h-3" />
            <span>Recommended</span>
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && isActive && (
        <div class="absolute top-0 left-0 bg-green-600 text-white px-4 py-1 text-xs font-bold uppercase rounded-br-lg">
          Current Plan
        </div>
      )}

      <div class="p-8">
        {/* Plan Name */}
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p class="text-sm text-gray-600 mb-6">{plan.description}</p>

        {/* Price */}
        <div class="mb-6 text-center">
          <div class="flex items-baseline justify-center gap-1">
            <span class="text-4xl font-bold text-gray-900">
              {hasPrice ? formatCurrency(price) : '$—'}
            </span>
            <span class="text-gray-600">/ month</span>
          </div>
        </div>

        {/* Features */}
        <ul class="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} class="flex items-start gap-3">
              <div class="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                <LuCheck class="w-3 h-3 text-orange-600" />
              </div>
              <span class="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Error Message */}
        {error.value && (
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error.value}
          </div>
        )}

        {/* Subscribe Button */}
        {isCurrentPlan && isActive ? (
          <button
            type="button"
            disabled
            class="w-full px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed"
          >
            Current Plan
          </button>
        ) : (
          <button
            type="button"
            onClick$={subscribe}
            disabled={isLoading.value}
            class={`w-full px-6 py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isFeatured
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:scale-105 shadow-lg'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isLoading.value ? (
              <>
                <LuLoader2 class="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Subscribe Now</span>
            )}
          </button>
        )}

        {/* Fine Print */}
        <p class="mt-4 text-xs text-gray-500 text-center">
          Cancel anytime • Secure payment via Paystack
        </p>
      </div>
    </div>
  );
});
