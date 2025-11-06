import { component$, useSignal, useVisibleTask$, $, useComputed$ } from '@builder.io/qwik';
import { LuSend, LuLoader2 } from '@qwikest/icons/lucide';

interface Author {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

interface ChatMessage {
  author: Author;
  streamId: string;
  content: string;
  type: 'user' | 'system' | 'moderator';
  timestamp: string;
}

interface LiveChatProps {
  streamId: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const LiveChat = component$<LiveChatProps>(({ streamId, currentUserId, currentUserName }) => {
  const messages = useSignal<ChatMessage[]>([]);
  const messageInput = useSignal('');
  const isLoading = useSignal(false);
  const error = useSignal('');
  const isConnected = useSignal(false);
  const isAuthenticated = useSignal<boolean | null>(null);
  const userDisplayName = useSignal<string>('You');
  const reconnecting = useSignal(false);
  const chatContainerRef = useSignal<HTMLDivElement>();

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

      // Load chat history
      const historyResponse = await fetch(`/api/chat/history?streamId=${encodeURIComponent(streamId)}`);
      if (historyResponse.ok) {
        const data = await historyResponse.json();
        if (data.success && Array.isArray(data.messages)) {
          messages.value = data.messages.reverse(); // Show oldest first
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    } catch (err) {
      console.error('[LiveChat] Failed to load history:', err);
      error.value = 'Failed to load chat history';
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
          messages.value = data.messages;
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
          // Add new message to the list
          messages.value = [...messages.value, data.data];
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (err) {
        console.error('[LiveChat] Failed to parse message:', err);
      }
    });

    eventSource.addEventListener('error', (e) => {
      console.error('[LiveChat] SSE error:', e);
      isConnected.value = false;
      if (isAuthenticated.value === false) {
        error.value = 'Please sign in to participate in live chat.';
      } else {
        // Small reconnect indicator instead of red error bar
        reconnecting.value = true;
        error.value = '';
      }
      // EventSource will auto-reconnect
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

      {/* Error Message */}
      {error.value && (
        <div class="px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-sm">
          {error.value}
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
            placeholder="Type your message..."
            bind:value={messageInput}
            disabled={isLoading.value || !isConnected.value || isAuthenticated.value === false}
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
            <a href="/auth/login" class="text-orange-600 font-semibold underline">Sign in to chat</a>
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
