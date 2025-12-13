import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead, Link, useLocation } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { SubscriptionCard } from '~/components/ui/SubscriptionCard';
import { LuArrowLeft, LuCheck } from '@qwikest/icons/lucide';
import { getEnv } from '~/utils/env';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly?: number;
  amount?: number; // fallback price (in cents)
  interval?: 'monthly'; // plans are monthly-only in UI
  features: string[];
  is_active: boolean;
  display_order: number;
  stripe_price_id_monthly?: string;
}

interface CurrentSubscription {
  id: string;
  user?: string;
  plan: {
    id: string;
    name: string;
    interval?: string;
  };
  status: string;
  current_period_end?: string;
  paystack_subscription_code?: string;
}

/**
 * Server-side data loader to fetch active subscription plans
 */
export const useSubscriptionPlansLoader = routeLoader$(async () => {
  try {
    const result = await payload.find({
      collection: 'subscription-plans',
      where: {
        is_active: {
          equals: true,
        },
      },
      sort: 'display_order',
      limit: 100,
    });

    // Normalize plans to ensure prices/features are parsed for UI
    const normalizedPlans = (result.docs || []).map((doc: any) => {
      const priceMonthly = typeof doc.price_monthly === 'number'
        ? doc.price_monthly
        : Number(doc.amount) || 0;

      const features = Array.isArray(doc.features)
        ? doc.features
            .map((f: any) => (typeof f === 'string' ? f : f?.feature))
            .filter(Boolean)
        : [];

      return {
        ...doc,
        price_monthly: priceMonthly,
        amount: typeof doc.amount === 'number' ? doc.amount : Number(doc.amount) || 0,
        interval: 'monthly',
        features,
      } as SubscriptionPlan;
    });

    return {
      plans: normalizedPlans,
      success: true,
    };
  } catch (error) {
    console.error('[Subscriptions] Failed to load plans:', error);
    return {
      plans: [],
      success: false,
      error: 'Failed to load subscription plans',
    };
  }
});

/**
 * Loader to check current user's subscription status
 */
export const useCurrentSubscriptionLoader = routeLoader$<CurrentSubscription | null>(async ({ cookie, request }) => {
  try {
    const origin = new URL(request.url).origin;
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Pass session token if available, otherwise CMS will use mock auth
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    // Call the web app's current subscription proxy endpoint
    const response = await fetch(`${origin}/api/subscriptions/current`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Subscriptions Loader] Current subscription:', data);
      return (data.subscription as CurrentSubscription) || null;
    } else {
      console.warn('[Subscriptions Loader] Failed to fetch subscription:', response.status);
    }
  } catch (err) {
    console.warn('[Subscriptions Loader] Failed to get current subscription:', err);
  }

  return null;
});

export default component$(() => {
  const plansData = useSubscriptionPlansLoader();
  const currentSubscription = useCurrentSubscriptionLoader();
  const location = useLocation();
  const toast = useSignal<string | null>(null);
  const autoSubscribePlanId = useSignal<string | null>(null);

  // Check for planId in URL params and auto-subscribe after login
  useVisibleTask$(({ track }) => {
    track(() => location.url.searchParams);

    const planId = location.url.searchParams.get('planId');

    if (planId) {
      // Show toast that user is logged in
      toast.value = 'You are now logged in. Proceeding to subscribe...';

      // Set the plan ID to auto-subscribe
      autoSubscribePlanId.value = planId;

      // Auto-trigger subscription after a brief delay for toast visibility
      setTimeout(() => {
        const plan = plansData.value.plans.find(p => p.id === planId);
        if (plan) {
          // Find the subscription card and trigger subscribe
          const subscribeBtn = document.querySelector(`[data-plan-id="${planId}"] button`);
          if (subscribeBtn instanceof HTMLButtonElement) {
            subscribeBtn.click();
          }
        }

        // Clear URL params
        const newUrl = new URL(location.url);
        newUrl.searchParams.delete('planId');
        window.history.replaceState({}, '', newUrl.toString());
      }, 1500);

      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.value = null;
      }, 3000);
    }
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Toast Notification */}
      {toast.value && (
        <div class="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div class="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <LuCheck class="w-5 h-5" />
            <span class="font-medium">{toast.value}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div class="bg-white border-b border-orange-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            class="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors mb-4"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to Home
          </Link>
          <h1 class="text-4xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p class="text-lg text-gray-600">
            Support our mission and unlock exclusive benefits
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Subscription Banner */}
        {currentSubscription.value && (
          <div class="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <LuCheck class="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-green-900">Active Subscription</h3>
                <p class="text-sm text-green-700">
                  You're currently subscribed to{' '}
                  <strong>{currentSubscription.value.plan?.name || 'Premium'}</strong>
                  {currentSubscription.value.status === 'active' && currentSubscription.value.current_period_end && (
                    <span> • Renews on {new Date(currentSubscription.value.current_period_end).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {!plansData.value.success && (
          <div class="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-xl text-center">
            <p class="text-red-700 font-medium">
              {plansData.value.error || 'Failed to load subscription plans. Please try again later.'}
            </p>
          </div>
        )}

        {/* Plans Grid */}
        {plansData.value.plans.length > 0 ? (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plansData.value.plans.map((plan: SubscriptionPlan) => (
              <div key={plan.id} data-plan-id={plan.id}>
                <SubscriptionCard
                  plan={plan}
                  currentSubscription={currentSubscription.value}
                />
              </div>
            ))}
          </div>
        ) : (
          !plansData.value.error && (
            <div class="text-center py-12">
              <p class="text-gray-500 text-lg">No subscription plans available at the moment.</p>
              <p class="text-gray-400 text-sm mt-2">Please check back later.</p>
            </div>
          )
        )}

        {/* FAQ Section */}
        <div class="mt-16 max-w-3xl mx-auto">
          <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div class="space-y-4">
            <details class="bg-white rounded-lg p-6 shadow-sm border border-orange-100">
              <summary class="font-semibold text-gray-900 cursor-pointer">
                How do subscriptions work?
              </summary>
              <p class="mt-3 text-gray-600 text-sm">
                Subscriptions are billed automatically on a monthly or yearly basis. You can cancel anytime
                from your account settings, and you'll retain access until the end of your billing period.
              </p>
            </details>

            <details class="bg-white rounded-lg p-6 shadow-sm border border-orange-100">
              <summary class="font-semibold text-gray-900 cursor-pointer">
                Can I change my plan later?
              </summary>
              <p class="mt-3 text-gray-600 text-sm">
                Yes! You can upgrade or downgrade your plan anytime from your account settings. Changes
                will be prorated based on your current billing cycle.
              </p>
            </details>

            <details class="bg-white rounded-lg p-6 shadow-sm border border-orange-100">
              <summary class="font-semibold text-gray-900 cursor-pointer">
                What payment methods do you accept?
              </summary>
              <p class="mt-3 text-gray-600 text-sm">
                We accept all major credit and debit cards through our secure payment processor, Paystack.
                Your payment information is encrypted and never stored on our servers.
              </p>
            </details>

            <details class="bg-white rounded-lg p-6 shadow-sm border border-orange-100">
              <summary class="font-semibold text-gray-900 cursor-pointer">
                Is there a free trial?
              </summary>
              <p class="mt-3 text-gray-600 text-sm">
                Currently, we don't offer a free trial, but you can cancel anytime if you're not satisfied.
                All our content is accessible without a subscription, with premium features unlocked for subscribers.
              </p>
            </details>
          </div>
        </div>

      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Subscription Plans - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Choose a subscription plan and support our mission. Unlock exclusive benefits and premium content.',
    },
  ],
};
