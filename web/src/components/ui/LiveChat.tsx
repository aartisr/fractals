import { component$, useSignal, useVisibleTask$, $, useComputed$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { LuSend, LuLoader2 } from '@qwikest/icons/lucide';
import { buildLoginUrl } from '~/utils/auth-service';

interface Author {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

interface SuperchatData {
  type: 'superchat';
  message: string;
  amount: number;
  tier: 'blue' | 'gold' | 'orange' | 'pink' | 'red';
  highlight_color: string;
  pin_duration_seconds: number;
  superchat_id: string;
}

interface ChatMessage {
  author: Author;
  streamId: string;
  content: string;
  type: 'user' | 'system' | 'moderator' | 'superchat';
  timestamp: string;
  superchatData?: SuperchatData;
}

interface LiveChatProps {
  streamId: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const LiveChat = component$<LiveChatProps>(({ streamId, currentUserId, currentUserName }) => {
  const loc = useLocation();
  const messages = useSignal<ChatMessage[]>([]);
  const messageInput = useSignal('');
  const isLoading = useSignal(false);
  const error = useSignal('');
  const isConnected = useSignal(false);
  const isAuthenticated = useSignal<boolean | null>(null);
  const userDisplayName = useSignal<string>('You');
  const reconnecting = useSignal(false);
  const authCheckInFlight = useSignal(false);
  const chatContainerRef = useSignal<HTMLDivElement>();
  const location = useLocation();
  const loginHref = buildLoginUrl(`${location.url.pathname}${location.url.search}`);

  // Display-only label
  const userName = useComputed$(() => currentUserName || 'You');

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = $(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });

  // Load initial chat history and connect SSE (requires auth)
  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => streamId);

    if (!streamId) return;

    isLoading.value = true;
    error.value = '';

    try {
      // Check authentication status
      const meResp = await fetch('/api/me', { method: 'GET' });
      if (!meResp.ok) {
        isAuthenticated.value = false;
        isLoading.value = false;
        error.value = 'Please sign in to participate in live chat.';
        return;
      }
      isAuthenticated.value = true;
      try {
        const meData = await meResp.json();
        const first = meData?.user?.first_name || '';
        const last = meData?.user?.last_name || '';
        const full = `${first} ${last}`.trim() || (meData?.user?.email ? String(meData.user.email).split('@')[0] : 'You');
        userDisplayName.value = full;
      } catch {}

    } catch (err) {
      console.error('[LiveChat] Auth check failed:', err);
    }

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/chat/stream?streamId=${encodeURIComponent(streamId)}`);

    eventSource.addEventListener('open', () => {
      console.log('[LiveChat] SSE connected');
      isConnected.value = true;
      error.value = '';
      reconnecting.value = false;
    });

    eventSource.addEventListener('connected', (e) => {
      console.log('[LiveChat] Connection confirmed:', e.data);
      isConnected.value = true;
      error.value = '';
      reconnecting.value = false;
    });

    eventSource.addEventListener('history', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.messages && Array.isArray(data.messages)) {
          // Parse superchat data for historical messages
          const parsedMessages = data.messages.map((msg: ChatMessage) => {
            if (msg.type === 'superchat' && msg.content) {
              try {
                const superchatData = JSON.parse(msg.content);
                return { ...msg, superchatData };
              } catch (parseErr) {
                console.error('[LiveChat] Failed to parse superchat content in history:', parseErr);
                return msg;
              }
            }
            return msg;
          });
          messages.value = parsedMessages;
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (err) {
        console.error('[LiveChat] Failed to parse history:', err);
      }
    });

    eventSource.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.data) {
          const msg = data.data;

          // Parse superchat data if it's a superchat message
          if (msg.type === 'superchat' && msg.content) {
            try {
              const superchatData = JSON.parse(msg.content);
              msg.superchatData = superchatData;
            } catch (parseErr) {
              console.error('[LiveChat] Failed to parse superchat content:', parseErr);
            }
          }

          // Add new message to the list
          messages.value = [...messages.value, msg];
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (err) {
        console.error('[LiveChat] Failed to parse message:', err);
      }
    });

    const revalidateSession = async () => {
      if (authCheckInFlight.value || isAuthenticated.value === false) {
        return;
      }
      authCheckInFlight.value = true;
      try {
        const meResp = await fetch('/api/me', { method: 'GET' });
        if (!meResp.ok) {
          isAuthenticated.value = false;
          reconnecting.value = false;
          error.value = 'Your session expired. Please sign in again to continue chatting.';
          eventSource.close();
        }
      } catch (recheckErr) {
        console.error('[LiveChat] Failed to re-check auth:', recheckErr);
      } finally {
        authCheckInFlight.value = false;
      }
    };

    eventSource.addEventListener('error', async (e) => {
      console.error('[LiveChat] SSE error:', e);
      isConnected.value = false;

      // Check if session expired by verifying auth status
      try {
        const meResp = await fetch('/api/me', { method: 'GET' });
        if (!meResp.ok) {
          // Session expired - user needs to sign in again
          isAuthenticated.value = false;
          error.value = 'Your session has expired. Please sign in again to participate in live chat.';
          reconnecting.value = false;
          eventSource.close();
          return;
        }
      } catch (authCheckErr) {
        console.error('[LiveChat] Auth check during error failed:', authCheckErr);
      }

      if (isAuthenticated.value === false) {
        error.value = 'Please sign in to participate in live chat.';
      } else {
        reconnecting.value = true;
        error.value = '';
        void revalidateSession();
      }
      // EventSource will auto-reconnect unless we close it above
    });

    isLoading.value = false;

    // Cleanup on unmount
    cleanup(() => {
      console.log('[LiveChat] Closing SSE connection');
      eventSource.close();
      isConnected.value = false;
    });
  });

  // Send message handler
  const sendMessage = $(async () => {
    if (!messageInput.value.trim() || isLoading.value) return;
    if (isAuthenticated.value === false) {
      error.value = 'Please sign in to send messages.';
      return;
    }

    const content = messageInput.value.trim();
    messageInput.value = '';
    isLoading.value = true;
    error.value = '';

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId,
          content,
          type: 'user',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Check if it's an authentication error (401/403)
        if (response.status === 401 || response.status === 403) {
          isAuthenticated.value = false;
          error.value = 'Your session has expired. Please sign in again to participate in live chat.';
          messageInput.value = content; // Restore message
          isLoading.value = false;
          return;
        }
        throw new Error(data.error || 'Failed to send message');
      }

      // Message will be received via SSE, no need to manually add
    } catch (err) {
      console.error('[LiveChat] Failed to send message:', err);
      error.value = err instanceof Error ? err.message : 'Failed to send message';
      // Restore message input on error
      messageInput.value = content;
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-md overflow-hidden flex flex-col" style={{ height: '500px' }}>
      {/* Header */}
      <div class="px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold">Live Chat</h2>
          <div class="flex items-center gap-2 text-sm">
            {reconnecting.value ? (
              <>
                <span class="w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
                <span>Reconnecting...</span>
              </>
            ) : isConnected.value ? (
              <>
                <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <span class="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        class="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isLoading.value && messages.value.length === 0 && (
          <div class="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
            <LuLoader2 class="w-4 h-4 animate-spin" />
            <span>Loading chat...</span>
          </div>
        )}

        {messages.value.length === 0 && !isLoading.value && (
          <div class="text-center text-gray-400 text-sm py-8">
            No messages yet. Be the first to say something!
          </div>
        )}

        {messages.value.map((msg, index) => (
          <div
            key={`${msg.timestamp}-${index}`}
            class={`flex flex-col gap-1 ${
              msg.type === 'system' ? 'items-center' : 'items-start'
            }`}
          >
            {msg.type === 'system' ? (
              <div class="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {msg.content}
              </div>
            ) : msg.type === 'moderator' ? (
              <div class="w-full">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded">
                    MOD
                  </span>
                  <span class="font-semibold text-purple-700 text-sm">{msg.author.displayName}</span>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-gray-900 text-sm">
                  {msg.content}
                </div>
              </div>
            ) : msg.type === 'superchat' && msg.superchatData ? (
              <div
                class="w-full border-2 rounded-lg overflow-hidden shadow-lg animate-pulse-once"
                style={{ borderColor: msg.superchatData.highlight_color }}
              >
                {/* Superchat Header */}
                <div
                  class="px-3 py-2 text-white font-bold flex items-center justify-between"
                  style={{ backgroundColor: msg.superchatData.highlight_color }}
                >
                  <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
                    </svg>
                    <span>{msg.author.displayName}</span>
                  </div>
                  <div class="text-sm font-bold">
                    ${(msg.superchatData.amount / 100).toFixed(2)}
                  </div>
                </div>

                {/* Superchat Message */}
                <div class="bg-white px-3 py-2 text-gray-900 text-sm font-medium">
                  {msg.superchatData.message}
                </div>
              </div>
            ) : (
              <div class="w-full">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="font-semibold text-orange-700 text-sm">{msg.author.displayName}</span>
                  <span class="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div class="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-gray-900 text-sm">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error/Auth Message */}
      {error.value && (
        <div class="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-orange-200 text-orange-800 text-sm flex items-center justify-between gap-3">
          <span>{error.value}</span>
          {isAuthenticated.value === false && (
            <a 
              href={loginHref} 
              class="px-4 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-full hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              Sign In
            </a>
          )}
        </div>
      )}

      {/* Input Area */}
      <div class="p-4 border-t border-gray-200 bg-white">
        <form
          preventdefault:submit
          class="flex gap-2"
          onSubmit$={sendMessage}
        >
          <input
            type="text"
            class="flex-1 border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder={isAuthenticated.value === false ? "Sign in to chat" : "Type your message..."}
            bind:value={messageInput}
            disabled={isLoading.value || isAuthenticated.value === false}
            maxLength={500}
          />
          <button
            type="submit"
            class="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            disabled={isLoading.value || !messageInput.value.trim() || !isConnected.value || isAuthenticated.value === false}
          >
            {isLoading.value ? (
              <LuLoader2 class="w-4 h-4 animate-spin" />
            ) : (
              <LuSend class="w-4 h-4" />
            )}
            <span class="hidden sm:inline">Send</span>
          </button>
        </form>
        {isAuthenticated.value === false ? (
          <div class="text-xs text-red-600 mt-2 flex items-center gap-2">
            <span>You are not signed in.</span>
            <a href={loginHref} class="text-orange-600 font-semibold underline">Sign in to chat</a>
          </div>
        ) : (
          <div class="text-xs text-gray-500 mt-2">
            Logged in as <span class="font-semibold">{userDisplayName.value}</span>
          </div>
        )}
      </div>
    </div>
  );
});
