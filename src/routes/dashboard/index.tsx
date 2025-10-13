/**
 * Dashboard Route - Protected route example
 * Shows how to check authentication and redirect if needed
 */

import { component$ } from '@builder.io/qwik';
import { type DocumentHead } from '@builder.io/qwik-city';
import { useUserContext } from '../plugin@auth';
import { LuUser, LuMail, LuCalendar, LuShield } from '@qwikest/icons/lucide';

export default component$(() => {
  const userContext = useUserContext();

  // If not authenticated, show login prompt
  if (!userContext.value.isAuthenticated || !userContext.value.user) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100 text-center">
          <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LuShield class="w-8 h-8 text-orange-600" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p class="text-gray-600 mb-6">
            Please sign in to access your dashboard and personalized content.
          </p>
          <a
            href="/auth/login"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const user = userContext.value.user;

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-8">
      <div class="max-w-6xl mx-auto">
        {/* Header */}
        <div class="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-orange-100 mb-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
              <LuUser class="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 class="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome, {user.first_name}!
              </h1>
              <p class="text-gray-600">Your personalized spiritual dashboard</p>
            </div>
          </div>
        </div>

        {/* User Info Cards */}
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Profile Info */}
          <div class="bg-white rounded-xl shadow-lg p-6 border border-orange-100 hover:shadow-xl transition-shadow">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <LuUser class="w-5 h-5 text-orange-600" />
              </div>
              <h3 class="font-semibold text-gray-900">Profile</h3>
            </div>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-500">Name:</span>
                <p class="font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
              </div>
              {user.gender && (
                <div>
                  <span class="text-gray-500">Gender:</span>
                  <p class="font-medium text-gray-900 capitalize">{user.gender}</p>
                </div>
              )}
            </div>
          </div>

          {/* Email Info */}
          <div class="bg-white rounded-xl shadow-lg p-6 border border-orange-100 hover:shadow-xl transition-shadow">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <LuMail class="w-5 h-5 text-blue-600" />
              </div>
              <h3 class="font-semibold text-gray-900">Contact</h3>
            </div>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-500">Email:</span>
                <p class="font-medium text-gray-900 break-all">{user.email}</p>
              </div>
              <div>
                <span class="text-gray-500">User ID:</span>
                <p class="font-mono text-xs text-gray-600 break-all">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div class="bg-white rounded-xl shadow-lg p-6 border border-orange-100 hover:shadow-xl transition-shadow">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <LuCalendar class="w-5 h-5 text-green-600" />
              </div>
              <h3 class="font-semibold text-gray-900">Account</h3>
            </div>
            <div class="space-y-2 text-sm">
              {user.created_at && (
                <div>
                  <span class="text-gray-500">Member Since:</span>
                  <p class="font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <span class="text-gray-500">Status:</span>
                <p class="font-medium text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div class="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-orange-100">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/playlists"
              class="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl transition-all border border-purple-200"
            >
              <span class="font-medium text-purple-900">View Playlists</span>
            </a>
            <a
              href="/ask"
              class="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 rounded-xl transition-all border border-blue-200"
            >
              <span class="font-medium text-blue-900">Ask Nithyananda</span>
            </a>
            <a
              href="/"
              class="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-xl transition-all border border-green-200"
            >
              <span class="font-medium text-green-900">Home</span>
            </a>
            <a
              href="/auth/logout"
              class="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-red-100 to-orange-100 hover:from-red-200 hover:to-orange-200 rounded-xl transition-all border border-red-200"
            >
              <span class="font-medium text-red-900">Sign Out</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Dashboard - Nityananda TV',
  meta: [
    {
      name: 'description',
      content: 'Your personalized spiritual dashboard',
    },
  ],
};
