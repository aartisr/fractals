
import { component$, useSignal, $ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { LuSend, LuSparkles, LuLogIn, LuShield } from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();
  const input = useSignal('');
  const messages = useSignal<{ role: 'user' | 'ai'; content: string }[]>([]);
  const mode = useSignal('Conversation Mode');

  // Protección de ruta: requiere autenticación
  if (!userContext.value.isAuthenticated) {
    return (
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100">
        <div class="max-w-md w-full space-y-8 relative text-center">
          <div class="inline-flex w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div class="absolute inset-0 bg-orange-500 blur-2xl opacity-30 rounded-full"></div>
            <LuShield class="w-10 h-10 text-white relative z-10" />
          </div>
          <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p class="text-gray-600 mb-8">
            Please sign in to access the AI chatbot and receive divine guidance
          </p>
          <div class="flex flex-col gap-3">
            <Link href="/signin" 
              class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <LuLogIn class="w-5 h-5" />
              Sign In to Continue
            </Link>
            <Link href="/" 
              class="px-8 py-4 border-2 border-orange-300 bg-white/50 backdrop-blur-sm text-orange-800 font-medium rounded-xl hover:bg-white hover:border-orange-400 hover:shadow-lg transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }


  const suggestions = [
    {
      title: "How can I use KAILASA Helpdesk?",
      category: "Getting Started"
    },
    {
      title: "Where is KAILASA located?",
      category: "About KAILASA"
    },
    {
      title: "How can I apply for a KAILASA Visa?",
      category: "Immigration"
    },
    {
      title: "Who is THE SPH?",
      category: "About SPH"
    }
  ];

  const conversations = [
    {
      title: "San Image of Akhilandeswara and Akhilandeshwari Avatar",
      excerpt: "I wanted to know more about...",
      date: "2 days ago"
    },
    {
      title: "Which parts of the soul remain clary and which par...",
      excerpt: "Could you explain in detail...",
      date: "5 days ago"
    }
  ];

  // Simulate AI response for demo
  const sendMessage = $(() => {
    if (!input.value.trim()) return;
    messages.value = [
      ...messages.value,
      { role: 'user', content: input.value }
    ];
    // Simulate AI response after user message
    setTimeout(() => {
      messages.value = [
        ...messages.value,
        {
          role: 'ai',
          content:
            "Nithyanandam, I have your birth details such as place, time of birth to generate the birth chart. I'll go ahead and start generating it right away."
        }
      ];
    }, 600);
    input.value = '';
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30">
      <div class="max-w-4xl mx-auto px-4 py-12 flex flex-col min-h-[80vh]">
        {/* Header */}
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-full mb-6">
            <LuSparkles class="w-3 h-3" />
            <span class="font-serif tracking-wide">AI-POWERED WISDOM</span>
          </div>
          <h1 class="text-4xl lg:text-5xl font-serif font-bold text-transparent bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text mb-4">
            Nithyananda, John!
          </h1>
          <p class="text-xl text-gray-700 font-light">
            What's on your mind today?
          </p>
        </div>

        {/* Chat UI */}
        <div class="flex-1 flex flex-col justify-end">
          {messages.value.length === 0 ? (
            <>
              {/* Main Input */}
              <div class="bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-orange-200/50 p-8 mb-8 shadow-xl">
                <div class="flex items-center gap-4 mb-6">
                  <textarea
                    bind:value={input}
                    placeholder="Ask Nithyananda..."
                    class="flex-1 bg-transparent text-gray-800 placeholder:text-gray-400 outline-none resize-none min-h-[80px] text-lg"
                    rows={3}
                  />
                </div>
                <div class="flex items-center justify-between">
                  <select
                    class="px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl text-sm text-gray-700 outline-none cursor-pointer hover:border-orange-300 transition-colors"
                    value={mode.value}
                    onChange$={e => (mode.value = (e.target as HTMLSelectElement).value)}
                  >
                    <option>Conversation Mode</option>
                    <option>Quick Answer Mode</option>
                    <option>Deep Wisdom Mode</option>
                  </select>
                  <button
                    class="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    onClick$={sendMessage}
                  >
                    <LuSend class="w-4 h-4" />
                    <span>Ask</span>
                  </button>
                </div>
              </div>

              {/* Quick Suggestions */}
              <div class="mb-12">
                <h2 class="text-lg font-serif font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <LuSparkles class="w-5 h-5 text-orange-500" />
                  Quick Suggestions
                </h2>
                <div class="grid sm:grid-cols-2 gap-4">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      class="text-left p-4 bg-white border-2 border-orange-200/50 rounded-xl hover:border-orange-400 hover:shadow-lg transition-all duration-300 group"
                      onClick$={() => {
                        input.value = item.title;
                      }}
                    >
                      <div class="text-xs text-orange-600 font-medium mb-2">{item.category}</div>
                      <div class="text-gray-800 group-hover:text-orange-600 transition-colors">{item.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Conversations */}
              <div>
                <h2 class="text-lg font-serif font-medium text-gray-900 mb-4">Discover</h2>
                <div class="space-y-4">
                  {conversations.map((conv, idx) => (
                    <div
                      key={idx}
                      class="p-6 bg-white border-2 border-orange-200/50 rounded-xl hover:border-orange-400 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    >
                      <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                          <span class="text-white text-sm font-serif">ॐ</span>
                        </div>
                        <div class="flex-1">
                          <h3 class="font-medium text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                            {conv.title}
                          </h3>
                          <p class="text-sm text-gray-600 mb-2 line-clamp-1">{conv.excerpt}</p>
                          <span class="text-xs text-gray-500">{conv.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Chat Bubbles */}
              <div class="flex flex-col gap-6 mb-8">
                {messages.value.map((msg, idx) => (
                  <div key={idx} class={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      class={
                        msg.role === 'user'
                          ? 'max-w-[70%] bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl px-6 py-4 shadow-lg text-lg font-medium'
                          : 'max-w-[70%] bg-white border-2 border-orange-200/50 text-gray-900 rounded-2xl px-6 py-4 shadow-md text-lg font-medium'
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {/* Input at bottom */}
              <div class="bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-orange-200/50 p-8 shadow-xl sticky bottom-0">
                <div class="flex items-center gap-4 mb-2">
                  <textarea
                    bind:value={input}
                    placeholder="Ask Nithyananda..."
                    class="flex-1 bg-transparent text-gray-800 placeholder:text-gray-400 outline-none resize-none min-h-[60px] text-lg"
                    rows={2}
                    onKeyDown$={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                </div>
                <div class="flex items-center justify-between">
                  <select
                    class="px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl text-sm text-gray-700 outline-none cursor-pointer hover:border-orange-300 transition-colors"
                    value={mode.value}
                    onChange$={e => (mode.value = (e.target as HTMLSelectElement).value)}
                  >
                    <option>Conversation Mode</option>
                    <option>Quick Answer Mode</option>
                    <option>Deep Wisdom Mode</option>
                  </select>
                  <button
                    class="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    onClick$={sendMessage}
                  >
                    <LuSend class="w-4 h-4" />
                    <span>Ask</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Ask Nithyananda - AI Wisdom',
  meta: [
    {
      name: 'description',
      content: 'Ask questions and receive divine wisdom through our AI-powered assistant',
    },
  ],
};
