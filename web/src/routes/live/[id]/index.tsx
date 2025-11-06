import { component$, useStyles$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';
import { LiveChat } from '~/components/ui/LiveChat';
import { LuArrowLeft, LuCalendar, LuShare2, LuHeart } from '@qwikest/icons/lucide';

/**
 * Server-side data loader para un live stream individual
 */
export const useLiveStreamLoader = routeLoader$(async ({ params, status }) => {
  const streamKey = params.id;

  const result = await payload.find({
    collection: 'live-streams',
    where: {
      streamKey: {
        equals: streamKey,
      },
    },
    depth: 1,
    limit: 1,
  });

  if (!result.docs.length) {
    status(404);
    return null;
  }
  // Sanitize document before sending to the client — do not expose RTMP URL
  const doc: any = result.docs[0];
  const { rtmpUrl, ...safe } = doc || {};
  return safe;
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

  // --- Datos del stream ---
  const stream = useLiveStreamLoader();

  if (!stream.value) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Stream Not Found</h1>
          <p class="text-gray-600 mb-8">The live stream you're looking for doesn't exist.</p>
          <Link
            href="/live"
            class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to Live Streams
          </Link>
        </div>
      </div>
    );
  }

  const isLive = stream.value.status === 'live';

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Back Navigation */}
      <div class="bg-white border-b border-orange-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/live"
            class="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <LuArrowLeft class="w-4 h-4" />
            Back to All Live Streams
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Video Player and Info */}
          <div class="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div class="relative">
              {/* Live Badge */}
              {isLive && (
                <div class="absolute top-8 left-8 z-10 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-semibold rounded-full shadow-xl">
                  <span class="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE NOW
                </div>
              )}

              {stream.value.masterPlaylistUrl ? (
                <div class="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoJSPlayer
                    sources={[
                      {
                        src: stream.value.masterPlaylistUrl,
                        type: 'application/x-mpegURL',
                      },
                    ]}
                    poster={stream.value.thumbnailUrl}
                    autoplay={isLive}
                    muted={false}
                  />
                </div>
              ) : (
                <div class="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white">
                  <div class="text-center">
                    <p class="text-xl mb-2">Stream Not Available</p>
                    <p class="text-sm text-gray-400">
                      {stream.value.status === 'idle' && 'Stream has not started yet'}
                      {stream.value.status === 'ended' && 'Stream has ended'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div class="p-6 bg-white/50 rounded-xl">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div class="flex-1">
                  <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {stream.value.title}
                  </h1>
                  <div class="flex items-center gap-2">
                    <span
                      class={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${
                        stream.value.status === 'live'
                          ? 'bg-red-100 text-red-700'
                          : stream.value.status === 'ended'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {stream.value.status === 'live' && <span class="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                      {String(stream.value.status).toUpperCase()}
                    </span>
                    {stream.value.visibility && (
                      <span
                        class={`px-3 py-1 text-sm font-semibold rounded-full ${
                          stream.value.visibility === 'public'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {stream.value.visibility}
                      </span>
                    )}
                  </div>
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
                {stream.value.date && (
                  <div class="flex items-center gap-1">
                    <LuCalendar class="w-4 h-4" />
                    <span>
                      {new Date(stream.value.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {stream.value.description && (
                <div class="mb-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-3">About this stream</h2>
                  <p class="text-gray-700 leading-relaxed whitespace-pre-line">
                    {stream.value.description}
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
                      navigator.share({ title: stream.value?.title, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                >
                  <LuShare2 class="w-4 h-4" />
                  Share Stream
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat */}
          <div class="lg:col-span-1">
            {stream.value?.id && (
              <LiveChat
                streamId={String(stream.value.id)}
                currentUserId="anonymous"
                currentUserName="Anonymous"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const stream = resolveValue(useLiveStreamLoader);
  return {
    title: stream?.title ? `${stream.title} - Nithyananda TV` : 'Live Stream - Nithyananda TV',
    meta: [
      {
        name: 'description',
        content: stream?.description || 'Watch live darshan and sacred teachings.',
      },
      {
        property: 'og:title',
        content: stream?.title || 'Nithyananda TV',
      },
      {
        property: 'og:description',
        content: stream?.description || 'Watch live darshan and sacred teachings.',
      },
      {
        property: 'og:image',
        content: stream?.thumbnailUrl || '',
      },
    ],
  };
};
