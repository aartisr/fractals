/**
 * Auth Error Route - Displays authentication errors
 * GET /auth/error?error=...&error_description=...
 */

import { component$ } from '@builder.io/qwik';
import { useLocation, type DocumentHead } from '@builder.io/qwik-city';
import { LuAlertCircle, LuHome, LuRefreshCw } from '@qwikest/icons/lucide';
import { buildLoginUrl } from '~/utils/auth-service';

export default component$(() => {
  const loc = useLocation();
  const error = loc.url.searchParams.get('error') || 'unknown_error';
  const errorDescription = loc.url.searchParams.get('error_description') || 'An unexpected error occurred during authentication.';
  const returnTo = loc.url.searchParams.get('returnTo') || '/';
  const loginHref = buildLoginUrl(returnTo);

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        <div class="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <LuAlertCircle class="w-8 h-8 text-red-600" />
          </div>

          {/* Error Title */}
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Authentication Failed
          </h1>

          {/* Error Code */}
          <div class="inline-block px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium mb-4">
            {error}
          </div>

          {/* Error Description */}
          <p class="text-gray-600 mb-8">
            {errorDescription}
          </p>

          {/* Action Buttons */}
          <div class="flex flex-col sm:flex-row gap-3 w-full">
            <a
              href={loginHref}
              class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
            >
              <LuRefreshCw class="w-5 h-5" />
              Try Again
            </a>
            <a
              href="/"
              class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              <LuHome class="w-5 h-5" />
              Go Home
            </a>
          </div>
        </div>

        {/* Help Text */}
        <div class="mt-6 pt-6 border-t border-gray-100 text-center">
          <p class="text-sm text-gray-500">
            Need help?{' '}
            <a href="/contact" class="text-orange-600 hover:text-orange-700 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Authentication Error - Nityananda',
  meta: [
    {
      name: 'description',
      content: 'An error occurred during authentication.',
    },
  ],
};
