import { component$, $,useStyles$, useSignal, useTask$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { routeLoader$, type DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';
import { LuArrowLeft, LuCalendar, LuShare2, LuHeart } from '@qwikest/icons/lucide';

// --- Live Chat server$ ---
export const chatServerQrl = server$(async function (args: { streamKey: string; text?: string; user?: string }) {
  const { streamKey, text, user } = args;

  // Si no hay texto, solo obtenemos los últimos mensajes
  if (!text) {
    const res = await payload.find({
      collection: 'live-chat-messages',
      where: { streamKey: { equals: streamKey } },
      sort: '-createdAt',
      limit: 50,
    });
    console.log('[Server$] Mensajes encontrados:', res?.docs);
    return res?.docs || [];
  }

  // Crear un nuevo mensaje
  await payload.create({
    collection: 'live-chat-messages',
    data: {
      streamKey,
      text,
      user,
    },
  });
  // Retornar la lista actualizada de mensajes
  const res = await payload.find({
    collection: 'live-chat-messages',
    where: { streamKey: { equals: streamKey } },
    sort: '-createdAt',
    limit: 50,
  });
  console.log('[Server$] Mensajes encontrados tras crear:', res?.docs);
  return res?.docs || [];
});

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

  return result.docs[0];
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

  // --- Estado del Live Chat ---
  const chatMessages = useSignal<any[]>([]);
  const chatInput = useSignal('');
  const chatLoading = useSignal(false);
  const chatError = useSignal('');

  // Cargar mensajes iniciales cuando cambia el streamKey
  useTask$(async ({ track }) => {
    const currentKey = track(() => stream.value?.streamKey);
    if (!currentKey) return;

    chatLoading.value = true;
    try {
      const msgs = await chatServerQrl({ streamKey: currentKey });
      console.log('[LiveChat] Mensajes cargados:', msgs);
      chatMessages.value = Array.isArray(msgs) ? (msgs as any[]).reverse() : [];
      chatError.value = '';
    } catch (e) {
      console.error('[LiveChat] Error al cargar mensajes:', e);
      chatError.value = 'Failed to load chat.';
    } finally {
      chatLoading.value = false;
    }
  });

  // Enviar mensaje nuevo
  const sendChatMessage = $(async () => {
    const currentKey = stream.value?.streamKey;
    if (!chatInput.value.trim() || !currentKey) return;

    chatLoading.value = true;
    try {
      // For demo, user is 'Anonymous' (replace with auth if available)
      console.log('[LiveChat] Enviando mensaje:', chatInput.value);
      await chatServerQrl({ streamKey: currentKey, text: chatInput.value, user: 'Anonymous' });
      // Recargar mensajes después de enviar
      const msgs = await chatServerQrl({ streamKey: currentKey });
      console.log('[LiveChat] Mensajes después de enviar:', msgs);
      chatMessages.value = Array.isArray(msgs) ? (msgs as any[]).reverse() : [];
      chatInput.value = '';
      chatError.value = '';
    } catch (e) {
      console.error('[LiveChat] Error al enviar mensaje:', e);
      chatError.value = 'Failed to send message.';
    }
    chatLoading.value = false;
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
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="space-y-6">
          {/* Live Chat */}
          <div class="bg-white/70 rounded-xl shadow-md p-4 mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-2">Live Chat</h2>
            <div class="flex flex-col gap-2 max-h-80 overflow-y-auto mb-4">
              {chatLoading.value && (
                <div class="text-gray-500 text-sm">Loading chat...</div>
              )}
              {chatError.value && (
                <div class="text-red-500 text-sm">{chatError.value}</div>
              )}
              {chatMessages.value.length === 0 && !chatLoading.value && (
                <div class="text-gray-400 text-sm">No messages yet. Be the first to say something!</div>
              )}
              {chatMessages.value.map((msg, i) => (
                <div key={(msg && (msg.id || msg._id)) ?? i} class="flex items-start gap-2">
                  <div class="font-semibold text-orange-700">{msg?.user || 'Anonymous'}</div>
                  <div class="bg-orange-50 rounded px-3 py-1 text-gray-900 text-sm">{msg?.text}</div>
                  <div class="text-xs text-gray-400 ml-auto">
                    {msg?.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                  </div>
                </div>
              ))}
            </div>
            <form
              preventdefault:submit
              class="flex gap-2"
              onSubmit$={async (e) => {
                e.preventDefault();
                await sendChatMessage();
              }}
            >
              <input
                type="text"
                class="flex-1 border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Type your message..."
                bind:value={chatInput}
                disabled={chatLoading.value}
                maxLength={200}
              />
              <button
                type="submit"
                class="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
                disabled={chatLoading.value || !chatInput.value.trim()}
              >
                Send
              </button>
            </form>
          </div>

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

            {/* Stream Details */}
            <div class="mb-6 p-4 bg-white rounded-lg border border-orange-100">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Stream Details</h3>
              <div class="space-y-1 text-sm text-gray-600">
                <div>
                  <span class="font-medium">Stream Key:</span> {stream.value.streamKey}
                </div>
                {stream.value.rtmpUrl && (
                  <div class="break-all">
                    <span class="font-medium">RTMP URL:</span> {stream.value.rtmpUrl}
                  </div>
                )}
                {stream.value.masterPlaylistUrl && (
                  <div class="break-all">
                    <span class="font-medium">Playlist URL:</span> {stream.value.masterPlaylistUrl}
                  </div>
                )}
              </div>
            </div>

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