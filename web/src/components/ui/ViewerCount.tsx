/**
 * ViewerCount Component
 *
 * Displays viewer metrics based on stream status:
 * - LIVE streams: Shows concurrent viewers (updates every 10s)
 * - ENDED/VOD streams: Shows total view count
 * - Supports both livestreams and regular videos via contentType parameter
 */

import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { LuEye, LuPlay } from '@qwikest/icons/lucide';

type ContentType = 'livestream' | 'video';

export interface ViewerCountProps {
  streamId?: string;
  videoId?: string;
  streamStatus: 'live' | 'ended' | 'idle';
  contentType?: ContentType;
  class?: string;
}

export const ViewerCount = component$<ViewerCountProps>(({
  streamId,
  videoId,
  streamStatus,
  contentType = 'livestream',
  class: className
}) => {
  const viewerCount = useSignal<number>(0);
  const totalViews = useSignal<number>(0);
  const isLoading = useSignal(true);
  const error = useSignal('');

  const contentId = streamId || videoId;
  const isLive = streamStatus === 'live';

  // Fetch concurrent viewers (for live streams)
  const fetchLiveViewers = $(async () => {
    if (!contentId) return;

    try {
      const params = new URLSearchParams({ contentType });
      if (streamId) params.append('streamId', streamId);
      if (videoId) params.append('videoId', videoId);

      const response = await fetch(`/api/viewers/count?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        viewerCount.value = data.viewerCount || 0;
        error.value = '';
      } else {
        console.error('[ViewerCount] Failed to fetch live viewers:', await response.text());
      }
    } catch (err) {
      console.error('[ViewerCount] Error fetching live viewers:', err);
    }
  });

  // Fetch total views (for VOD/ended streams)
  const fetchTotalViews = $(async () => {
    if (!contentId) return;

    try {
      const params = new URLSearchParams({ contentType });
      if (streamId) params.append('streamId', streamId);
      if (videoId) params.append('videoId', videoId);

      const response = await fetch(`/api/viewers/total?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        totalViews.value = data.totalViews || 0;
        error.value = '';
      } else {
        console.error('[ViewerCount] Failed to fetch total views:', await response.text());
      }
    } catch (err) {
      console.error('[ViewerCount] Error fetching total views:', err);
    } finally {
      isLoading.value = false;
    }
  });

  // Set up polling for live streams, single fetch for VOD
  useVisibleTask$(({ cleanup }) => {
    if (!contentId) return;

    if (isLive) {
      // Live stream: Poll concurrent viewers every 10 seconds
      fetchLiveViewers();
      isLoading.value = false;

      const interval = setInterval(() => {
        fetchLiveViewers();
      }, 10000);

      cleanup(() => {
        clearInterval(interval);
      });
    } else {
      // VOD/Ended: Fetch total views once
      fetchTotalViews();
    }
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

  // Show concurrent viewers for live streams
  if (isLive) {
    return (
      <div
        class={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-100 to-orange-100 rounded-full text-sm font-medium ${className || ''}`}
        title="Watching now"
      >
        <LuEye class="w-4 h-4 text-red-600 animate-pulse" />
        <span class="text-red-700">
          {viewerCount.value.toLocaleString()} watching
        </span>
      </div>
    );
  }

  // Show total views for VOD/ended streams
  return (
    <div
      class={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-slate-100 rounded-full text-sm font-medium ${className || ''}`}
      title="Total views"
    >
      <LuPlay class="w-4 h-4 text-gray-600" />
      <span class="text-gray-700">
        {totalViews.value.toLocaleString()} {totalViews.value === 1 ? 'view' : 'views'}
      </span>
    </div>
  );
});
