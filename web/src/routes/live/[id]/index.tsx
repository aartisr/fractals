import { component$, useStyles$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { getSessionFromAuthService } from '~/utils/auth-service';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';
import { LiveChat } from '~/components/ui/LiveChat';
import { SuperchatInput } from '~/components/ui/SuperchatInput';
import { LiveViewerCount } from '~/components/ui/LiveViewerCount';
import { useViewerSession } from '~/hooks/useViewerSession';
import { LuArrowLeft, LuCalendar, LuShare2, LuHeart } from '@qwikest/icons/lucide';

type TranscriptSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  rev: number;
  isStable: boolean;
};

type TranscriptResponse = {
  segments: TranscriptSegment[];
};

type TranscriptLanguageMeta = {
  language: string;
  version: number;
  isFinal: boolean;
};

type TranscriptLanguagesResponse = {
  streamId: number;
  languages: TranscriptLanguageMeta[];
};

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
      visibility: {
        equals: 'public',
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

/**
 * Server-side data loader for current user info (optional)
 */
export const useCurrentUserLoader = routeLoader$(async ({ cookie, env }) => {
  const sessionToken = cookie.get('nandi_session_token')?.value;

  if (!sessionToken) {
    return null; // Not authenticated, return null
  }

  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');

  if (!authBase || !clientId) {
    console.warn('[User Loader] Auth configuration missing');
    return null;
  }

  try {
    // Get user data from auth service
    const data = await getSessionFromAuthService(sessionToken, clientId, authBase);
    const user = data.user;

    if (user && !user.is_anonymous) {
      // Construct full name from first_name and last_name
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || user.email || 'Devotee';

      return {
        id: user.id,
        name: fullName,
        email: user.email,
      };
    }
  } catch (err) {
    console.warn('[User Loader] Failed to get user info:', err);
  }

  return null;
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
  const currentUser = useCurrentUserLoader();

  // --- Viewer tracking ---
  // Track viewers for ALL streams (live, ended, idle) to get view counts
  const isLive = stream.value?.status === 'live';

  const viewerSession = useViewerSession({
    streamId: stream.value?.id ? String(stream.value.id) : '',
    viewerName: currentUser.value?.name || 'Anonymous',
    enabled: !!stream.value?.id, // Track ALL streams (live and VOD)
  });

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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stream Title and Status - Full width */}
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3 break-words">
              {stream.value.title}
            </h1>
            <div class="flex items-center gap-2 flex-wrap">
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
              {/* Live Viewer Count */}
              {stream.value.status === 'live' && stream.value.id && (
                <LiveViewerCount streamId={String(stream.value.id)} />
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

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Video Player, Transcript, and Info */}
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
                    masterPlaylistUrl={stream.value.masterPlaylistUrl}
                    isLive={isLive}
                    poster={stream.value.thumbnailUrl}
                    autoplay={isLive}
                    muted={false}
                    onPlay$={viewerSession.handlePlay}
                    onPause$={viewerSession.handlePause}
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

            {/* Transcript Snapshot */}
            {stream.value.id && <TranscriptSnapshot streamId={stream.value.id} />}

            {/* Stream Info */}
            <div class="p-6 bg-white/50 rounded-xl">
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

          {/* Right Column: Live Chat & Superchat */}
          <div class="lg:col-span-1 space-y-4">
            {stream.value?.id && (
              <>
                <LiveChat
                  streamId={String(stream.value.id)}
                  currentUserId={currentUser.value?.id || 'anonymous'}
                  currentUserName={currentUser.value?.name || 'Anonymous'}
                />
                <SuperchatInput streamId={String(stream.value.id)} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const TranscriptSnapshot = component$<{ streamId: number }>(({ streamId }) => {
  const segments = useSignal<TranscriptSegment[]>([]);
  const isLoading = useSignal(true);
  const isConnected = useSignal(false);
  const error = useSignal('');
  const transcriptContainerRef = useSignal<HTMLDivElement>();
  const availableLanguages = useSignal<TranscriptLanguageMeta[]>([]);
  const selectedLanguage = useSignal('en');
  const eventSourceRef = useSignal<EventSource | null>(null);

  // Auto-scroll to bottom when new segments arrive
  const scrollToBottom = $(() => {
    if (transcriptContainerRef.value) {
      transcriptContainerRef.value.scrollTop = transcriptContainerRef.value.scrollHeight;
    }
  });

  // Fetch available languages
  useVisibleTask$(async () => {
    try {
      const res = await fetch(`/api/transcription/languages?streamId=${streamId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.languages && Array.isArray(data.languages)) {
          availableLanguages.value = data.languages;
          // Set default language if available
          if (data.languages.length > 0 && !data.languages.find((l: TranscriptLanguageMeta) => l.language === 'en')) {
            selectedLanguage.value = data.languages[0].language;
          }
        }
      }
    } catch (err) {
      console.error('[Transcription] Failed to fetch languages:', err);
    }
  });

  // Connect to SSE stream (reconnect when language changes)
  useVisibleTask$(({ track, cleanup }) => {
    track(() => selectedLanguage.value);

    let isCancelled = false;

    cleanup(() => {
      isCancelled = true;
      if (eventSourceRef.value) {
        eventSourceRef.value.close();
        eventSourceRef.value = null;
      }
    });

    // Close existing connection if any
    if (eventSourceRef.value) {
      eventSourceRef.value.close();
    }

    // Reset state
    isConnected.value = false;
    isLoading.value = true;

    // Connect to SSE stream for real-time updates
    const eventSource = new EventSource(`/api/transcription/stream?streamId=${streamId}&language=${selectedLanguage.value}`);
    eventSourceRef.value = eventSource;

    eventSource.addEventListener('open', () => {
      console.log('[Transcription] SSE connected');
      isConnected.value = true;
      error.value = '';
    });

    eventSource.addEventListener('snapshot', (e) => {
      if (isCancelled) return;
      try {
        const data = JSON.parse(e.data) as TranscriptResponse;
        if (data.segments && Array.isArray(data.segments)) {
          segments.value = data.segments;
          isLoading.value = false;
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (err) {
        console.error('[Transcription] Failed to parse snapshot:', err);
      }
    });

    eventSource.addEventListener('ping', () => {
      // Just a keep-alive, no action needed
    });

    eventSource.addEventListener('error', (e) => {
      // Only log if we were previously connected (indicates actual error, not initial connection)
      if (isConnected.value) {
        console.warn('[Transcription] SSE connection lost, reconnecting...');
      }
      isConnected.value = false;
      if (!isCancelled) {
        error.value = 'Connection lost, reconnecting...';
      }
      // EventSource will auto-reconnect
    });

    isLoading.value = false;
  });

  if (isLoading.value) {
    return (
      <div class="p-4 bg-white/60 rounded-xl border border-orange-100">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900">Live Transcript</h2>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="w-2 h-2 bg-gray-400 rounded-full" />
            <span>Connecting...</span>
          </div>
        </div>
        <div class="text-sm text-gray-500">Loading transcript...</div>
      </div>
    );
  }

  if (segments.value.length === 0) {
    return (
      <div class="p-4 bg-white/60 rounded-xl border border-orange-100">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900">Live Transcript</h2>
          <div class="flex items-center gap-2 text-xs">
            {isConnected.value ? (
              <>
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span class="text-green-600">Live</span>
              </>
            ) : (
              <>
                <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span class="text-amber-600">Reconnecting...</span>
              </>
            )}
          </div>
        </div>
        <div class="text-center text-gray-400 text-sm py-4">
          No transcript available yet. Transcription will appear here when the stream starts.
        </div>
      </div>
    );
  }

  return (
    <div class="p-4 bg-white/60 rounded-xl border border-orange-100">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-gray-900">Live Transcript</h2>
        <div class="flex items-center gap-3">
          {/* Language Selector */}
          {availableLanguages.value.length > 1 && (
            <select
              class="text-xs px-2 py-1 border border-orange-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={selectedLanguage.value}
              onChange$={(e) => {
                selectedLanguage.value = (e.target as HTMLSelectElement).value;
              }}
            >
              {availableLanguages.value.map((lang) => (
                <option key={lang.language} value={lang.language}>
                  {getLanguageName(lang.language)}
                </option>
              ))}
            </select>
          )}
          {/* Connection Status */}
          <div class="flex items-center gap-2 text-xs">
            {isConnected.value ? (
              <>
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span class="text-green-600">Live</span>
              </>
            ) : (
              <>
                <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span class="text-amber-600">Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        ref={transcriptContainerRef}
        class="space-y-2 max-h-64 overflow-y-auto text-sm text-gray-800"
        style={{ scrollBehavior: 'smooth' }}
      >
        {segments.value.map((seg) => (
          <div key={seg.id} class="flex gap-3">
            <div class="min-w-[64px] text-xs text-gray-500">
              {formatMs(seg.startMs)}–{formatMs(seg.endMs)}
            </div>
            <div>{seg.text}</div>
          </div>
        ))}
      </div>
      {error.value && (
        <div class="mt-2 text-xs text-amber-600">{error.value}</div>
      )}
    </div>
  );
});

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getLanguageName(code: string): string {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
  };
  return languageNames[code] || code.toUpperCase();
}

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
