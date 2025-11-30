import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { SubscriptionCard } from '~/components/ui/SubscriptionCard';
import { LuArrowLeft, LuCheck } from '@qwikest/icons/lucide';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  display_order: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

interface CurrentSubscription {
  id: string;
  plan: {
    id: string;
    name: string;
  };
  status: string;
  interval: 'monthly' | 'yearly';
  current_period_end?: string;
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

    return {
      plans: result.docs || [],
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
export const useCurrentSubscriptionLoader = routeLoader$<CurrentSubscription | null>(async ({ cookie, env }) => {
  const sessionToken = cookie.get('nandi_session_token')?.value;

  if (!sessionToken) {
    return null; // Not authenticated
  }

  const cmsApiUrl = env.get('PUBLIC_CMS_API_URL') || 'http://localhost:3000';

  try {
    const response = await fetch(`${cmsApiUrl}/api/subscriptions/current`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (data.subscription as CurrentSubscription) || null;
    }
  } catch (err) {
    console.warn('[Subscriptions] Failed to get current subscription:', err);
  }

  return null;
});

export default component$(() => {
  const plansData = useSubscriptionPlansLoader();
  const currentSubscription = useCurrentSubscriptionLoader();

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
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
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                currentSubscription={currentSubscription.value}
              />
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

        {/* Support Section */}
        <div class="mt-12 text-center">
          <p class="text-gray-600">
            Need help? <a href="/contact" class="text-orange-600 font-semibold hover:underline">Contact our support team</a>
          </p>
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
