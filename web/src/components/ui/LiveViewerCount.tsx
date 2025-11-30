/**
 * LiveViewerCount Component
 *
 * Displays the current number of viewers watching a livestream
 * Updates every 10 seconds to show real-time viewer count
 */

import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { LuEye } from '@qwikest/icons/lucide';

export interface LiveViewerCountProps {
  streamId: string;
  class?: string;
}

export const LiveViewerCount = component$<LiveViewerCountProps>(({ streamId, class: className }) => {
  const viewerCount = useSignal<number>(0);
  const isLoading = useSignal(true);
  const error = useSignal('');

  // Fetch viewer count
  const fetchViewerCount = $(async () => {
    try {
      const response = await fetch(`/api/viewers/count?streamId=${encodeURIComponent(streamId)}`);

      if (response.ok) {
        const data = await response.json();
        viewerCount.value = data.viewerCount || 0;
        error.value = '';
      } else {
        console.error('[LiveViewerCount] Failed to fetch viewer count:', await response.text());
        error.value = 'Failed to load viewer count';
      }
    } catch (err) {
      console.error('[LiveViewerCount] Error fetching viewer count:', err);
      error.value = 'Error loading viewer count';
    } finally {
      isLoading.value = false;
    }
  });

  // Set up periodic polling
  useVisibleTask$(({ cleanup }) => {
    if (!streamId) return;

    // Fetch immediately
    fetchViewerCount();

    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchViewerCount();
    }, 10000);

    cleanup(() => {
      clearInterval(interval);
    });
  });

  if (isLoading.value) {
    return (
      <div class={`inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm ${className || ''}`}>
        <LuEye class="w-4 h-4 text-gray-500" />
        <span class="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error.value) {
    return null; // Silently fail for better UX
  }

  return (
    <div
      class={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-100 to-orange-100 rounded-full text-sm font-medium ${className || ''}`}
      title="Live viewers"
    >
      <LuEye class="w-4 h-4 text-red-600 animate-pulse" />
      <span class="text-red-700">
        {viewerCount.value.toLocaleString()} {viewerCount.value === 1 ? 'viewer' : 'viewers'}
      </span>
    </div>
  );
});
