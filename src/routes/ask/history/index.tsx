import { component$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import { LuMessageCircle, LuClock } from '@qwikest/icons/lucide';

export default component$(() => {
  const pastChats = [
    {
      id: 1,
      title: "San Image of Akhilandeswara and Akhilandeshwari Avatar",
      excerpt: "I wanted to know more about the divine imagery...",
      date: "2 days ago",
      messages: 12
    },
    {
      id: 2,
      title: "Which parts of the soul remain clear and which parts evolve?",
      excerpt: "Could you explain in detail about soul evolution...",
      date: "5 days ago",
      messages: 8
    },
    {
      id: 3,
      title: "Understanding the concept of Kundalini awakening",
      excerpt: "What are the stages and practices for awakening...",
      date: "1 week ago",
      messages: 15
    },
    {
      id: 4,
      title: "The significance of meditation in daily life",
      excerpt: "How can I incorporate meditation effectively...",
      date: "2 weeks ago",
      messages: 6
    },
    {
      id: 5,
      title: "Exploring the teachings on consciousness",
      excerpt: "What does SPH Nithyananda teach about pure consciousness...",
      date: "3 weeks ago",
      messages: 20
    }
  ];

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30">
      <div class="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div class="mb-8">
          <h1 class="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-2">
            Past Conversations
          </h1>
          <p class="text-gray-600">
            Review your previous dialogues with Nithyananda AI
          </p>
        </div>

        {/* Past Chats List */}
        <div class="space-y-4">
          {pastChats.map((chat) => (
            <div
              key={chat.id}
              class="p-6 bg-white border-2 border-orange-200/50 rounded-xl hover:border-orange-400 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <LuMessageCircle class="w-6 h-6 text-white" />
                </div>
                <div class="flex-1">
                  <h3 class="font-serif font-medium text-lg text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {chat.title}
                  </h3>
                  <p class="text-sm text-gray-600 mb-3 line-clamp-2">{chat.excerpt}</p>
                  <div class="flex items-center gap-4 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <LuClock class="w-3 h-3" />
                      {chat.date}
                    </span>
                    <span>•</span>
                    <span>{chat.messages} messages</span>
                  </div>
                </div>
                <button class="px-4 py-2 text-sm bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100">
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State if no chats */}
        {pastChats.length === 0 && (
          <div class="text-center py-20">
            <div class="inline-flex w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full items-center justify-center mb-6">
              <LuMessageCircle class="w-10 h-10 text-orange-600" />
            </div>
            <h3 class="text-xl font-serif font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p class="text-gray-600 mb-6">Start your first dialogue with Nithyananda AI</p>
            <a
              href="/ask"
              class="inline-flex px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Start New Chat
            </a>
          </div>
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Past Chats - Ask Nithyananda',
  meta: [
    {
      name: 'description',
      content: 'Review your previous conversations with Nithyananda AI',
    },
  ],
};
