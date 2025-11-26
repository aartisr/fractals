import { component$, useStyles$ } from '@builder.io/qwik';
import { routeLoader$, DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';
import { LuArrowLeft, LuClock, LuCalendar, LuTag, LuShare2, LuHeart } from '@qwikest/icons/lucide';

/**
 * Server-side data loader for individual video
 */
export const useVideoLoader = routeLoader$(async ({ params, status }) => {
  const videoId = params.id;

  try {
    // Fetch video by videoId field from Payload CMS
    const result = await payload.find({
      collection: 'videos',
      where: {
        videoId: {
          equals: videoId,
        },
      },
      depth: 1, // Populate category relationship
      limit: 1,
    });

    if (result.docs.length === 0) {
      status(404);
      return null;
    }

    return result.docs[0];
  } catch (error) {
    console.error('Error fetching video:', error);
    status(404);
    return null;
  }
});

const styles = `
  .frame {
    position: relative;
    width: 100%;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 18px;
    box-shadow: 0 10px 30px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
    padding: 14px;
    gap: 12px;
    display: grid;
    overflow: hidden;
  }

  .frame::before {
    content: "";
    position: absolute;
    inset: -20px;
    background: inherit;
    filter: blur(30px) brightness(0.6);
    z-index: -1;
    border-radius: 18px;
  }
`;

export default component$(() => {
  useStyles$(styles);
  const video = useVideoLoader();

  if (!video.value) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Video Not Found</h1>
          <p class="text-gray-600 mb-8">The video you're looking for doesn't exist.</p>
          <Link
            href="/videos"
            class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to Videos
          </Link>
        </div>
      </div>
    );
  }

  const category = typeof video.value.category === 'object' ? video.value.category : null;

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Back Navigation */}
      <div class="bg-white border-b border-orange-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/videos"
            class="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to All Videos
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="space-y-6">
          {/* Video Player */}
          <div class="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoJSPlayer
              masterPlaylistUrl={(video.value as any)?.masterUrl}
              poster={(video.value as any).thumbnail}
              autoplay={false}
              muted={false}
            />
          </div>

          {/* Video Info */}
          <div class="p-6 bg-white/50 rounded-xl">
            <div class="flex items-start justify-between gap-4 mb-4">
              <div class="flex-1">
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {video.value.title}
                </h1>
                {category && (
                  <Link
                    href={`/videos?category=${category.id}`}
                    class="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full hover:bg-orange-200 transition-colors"
                  >
                    <LuTag class="w-3 h-3" />
                    {category.name}
                  </Link>
                )}
              </div>
              <button
                type="button"
                class="p-3 rounded-full hover:bg-orange-100 transition-colors"
                aria-label="Add to favorites"
              >
                <LuHeart class="w-6 h-6 text-orange-600" />
              </button>
            </div>

            {/* Metadata */}
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              {video.value.duration && (
                <div class="flex items-center gap-1">
                  <LuClock class="w-4 h-4" />
                  <span>{video.value.duration}</span>
                </div>
              )}
              {video.value.date && (
                <div class="flex items-center gap-1">
                  <LuCalendar class="w-4 h-4" />
                  <span>
                    {new Date(video.value.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {video.value.description && (
              <div class="mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-3">About this video</h2>
                <p class="text-gray-700 leading-relaxed whitespace-pre-line">
                  {video.value.description}
                </p>
              </div>
            )}

            {/* Share Section */}
            <div class="pt-6 border-t border-orange-100">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick$={() => {
                  if (navigator.share) {
                    navigator.share({ title: video.value?.title, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
              >
                <LuShare2 class="w-4 h-4" />
                Share Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styles moved to useStyles$ above */}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const video = resolveValue(useVideoLoader);
  return {
    title: video?.title ? `${video.title} - Nithyananda TV` : 'Video - Nithyananda TV',
    meta: [
      {
        name: 'description',
        content: video?.description || 'Watch sacred teachings and spiritual wisdom.',
      },
      {
        property: 'og:title',
        content: video?.title || 'Nithyananda TV',
      },
      {
        property: 'og:description',
        content: video?.description || 'Watch sacred teachings and spiritual wisdom.',
      },
      {
        property: 'og:image',
        content: video?.thumbnail || '',
      },
    ],
  };
};
