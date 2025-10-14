import { component$, useSignal, $ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { LuSearch, LuFilter, LuX, LuLogIn, LuShield } from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';

interface ModelType {
  id: number;
  name: string;
  description: string;
  image: string;
  category: string;
  features?: string[];
  prompts?: string[];
}

export default component$(() => {
  const userContext = useUserContext();
  const searchQuery = useSignal('');
  const selectedFilter = useSignal('All');
  const selectedModel = useSignal<ModelType | null>(null);
  const showModal = useSignal(false);

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
            Please sign in to access the AI models and sacred teachings
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


  const filters = [
    'All',
    'AI Assistant',
    'Education',
    'Vedic Sciences',
    'Arts & Music',
    'Scriptures',
    'Temple Sciences',
    'Spirituality'
  ];

  const recentlyUsed: ModelType[] = [
    {
      id: 1,
      name: 'Ask Nithyananda',
      description: "Avatar's intelligence reaching you through Artificial Intelligence",
      image: '/images/avatar-ask.jpg',
      category: 'AI Assistant',
      features: [
        'Direct access to avatar wisdom',
        'Personalized spiritual guidance',
        'Instant responses to your questions'
      ],
      prompts: [
        'What is the purpose of life?',
        'How can I achieve enlightenment?',
        'Tell me about Vedic sciences',
        'Guide me on my spiritual journey'
      ]
    },
    {
      id: 2,
      name: 'Nithyananda Rajavidya Gurukul',
      description: 'Empowering the Next Generation to Live as Gods',
      image: '/images/avatar-gurukul.jpg',
      category: 'Education',
      features: [
        'Ancient education system',
        'Holistic development approach',
        'Integration of modern and traditional learning'
      ],
      prompts: [
        'What is Rajavidya education?',
        'How does the gurukul system work?',
        'What subjects are taught?',
        'How can my child enroll?'
      ]
    },
    {
      id: 3,
      name: 'Sauram/Jyothisha (Hindu Astrology)',
      description: 'Learn the science of astrology and explore the tradition of Lord Surya',
      image: '/images/avatar-astrology.jpg',
      category: 'Vedic Sciences',
      features: [
        'Authentic Vedic astrology',
        'Birth chart analysis',
        'Predictive insights based on planetary positions'
      ],
      prompts: [
        'Can you create my birth chart?',
        'Can you predict my future?',
        'What does my zodiac sign mean?',
        'Tell me about planetary influences'
      ]
    },
    {
      id: 4,
      name: 'Nithyananda Rajavidya Gurukul',
      description: 'Empowering the Next Generation to Live as Gods',
      image: '/images/avatar-gurukul2.jpg',
      category: 'Education',
      features: [
        'Ancient education system',
        'Holistic development approach',
        'Integration of modern and traditional learning'
      ],
      prompts: [
        'What is Rajavidya education?',
        'How does the gurukul system work?',
        'What subjects are taught?',
        'How can my child enroll?'
      ]
    }
  ];

  const topPicks: ModelType[] = [
    {
      id: 5,
      name: 'Gandharva Veda: Hindu Arts & Music',
      description: 'Immerse in classical music and performing arts',
      image: '/images/avatar-gandharva.jpg',
      category: 'Arts & Music',
      features: [
        'Classical music traditions',
        'Performing arts guidance',
        'Spiritual connection through music'
      ],
      prompts: [
        'Teach me about classical music',
        'What are the key ragas?',
        'How does music connect to spirituality?',
        'Guide me in learning an instrument'
      ]
    },
    {
      id: 6,
      name: 'Mahabharata',
      description: 'Dive deep into the legendary epic of mahabharata the biggest scripture in the world',
      image: '/images/avatar-mahabharata.jpg',
      category: 'Scriptures',
      features: [
        'Complete epic exploration',
        'Character analysis and lessons',
        'Philosophical insights from the text'
      ],
      prompts: [
        'Tell me about Bhagavad Gita',
        'What are the key lessons from Mahabharata?',
        'Explain the Kurukshetra war',
        'Who are the main characters?'
      ]
    },
    {
      id: 7,
      name: 'Science of Temple & Invoking Deities',
      description: 'Explore the traditional unity of deity worship and Hindu temple traditions',
      image: '/images/avatar-temple.jpg',
      category: 'Temple Sciences',
      features: [
        'Temple architecture insights',
        'Deity worship practices',
        'Sacred rituals and their meanings'
      ],
      prompts: [
        'How do temples work?',
        'What is the science behind rituals?',
        'Explain puja procedures',
        'Tell me about temple architecture'
      ]
    },
    {
      id: 8,
      name: 'Agamantha: Understanding Shiva',
      description: 'Gain knowledge of ancient Hindu temple traditions',
      image: '/images/avatar-shiva.jpg',
      category: 'Spirituality',
      features: [
        'Deep understanding of Lord Shiva',
        'Agamic traditions and practices',
        'Spiritual transformation guidance'
      ],
      prompts: [
        'Who is Lord Shiva?',
        'What are Agamic traditions?',
        'How can I connect with Shiva?',
        'Explain Shiva meditation practices'
      ]
    }
  ];

  const exploreAll = [
    {
      id: 9,
      name: 'Ask Nithyananda',
      description: "Avatar's intelligence reaching you through Artificial Intelligence",
      image: '/images/avatar-ask.jpg',
      category: 'AI Assistant'
    },
    {
      id: 10,
      name: 'Nithyananda Rajavidya Gurukul',
      description: 'Empowering the Next Generation to Live as Gods',
      image: '/images/avatar-gurukul.jpg',
      category: 'Education'
    },
    {
      id: 11,
      name: 'Ramayana',
      description: 'Explore the greatest scripture, an enlightening story of Lord Rama',
      image: '/images/avatar-ramayana.jpg',
      category: 'Scriptures'
    },
    {
      id: 12,
      name: 'Arthashatra: Science of Hindu Economics',
      description: 'Gain knowledge of ancient Hindu economics and governance',
      image: '/images/avatar-arthashastra.jpg',
      category: 'Vedic Sciences'
    }
  ];

  // Filter logic
  const filteredExploreAll = exploreAll.filter(model => 
    selectedFilter.value === 'All' || model.category === selectedFilter.value
  );

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30">
      <div class="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div class="text-center mb-8">
          <h1 class="text-4xl lg:text-5xl font-serif font-bold text-transparent bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text mb-3">
            Avatar models
          </h1>
          <p class="text-lg text-gray-600">
            Choose from 45+ personalized custom trained models
          </p>
        </div>

        {/* Search Bar */}
        <div class="max-w-2xl mx-auto mb-8">
          <div class="relative">
            <LuSearch class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search models"
              class="w-full pl-12 pr-4 py-4 bg-white border-2 border-orange-200/50 rounded-2xl text-gray-800 placeholder:text-gray-400 outline-none focus:border-orange-400 transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Recently Used Section */}
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-serif font-semibold text-gray-900">Recently used</h2>
            <button class="text-sm text-orange-600 hover:text-orange-700 font-medium px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
              View more
            </button>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentlyUsed.map((model) => (
              <div
                key={model.id}
                onClick$={$(() => {
                  selectedModel.value = model;
                  showModal.value = true;
                })}
                class="group bg-white border-2 border-orange-200/50 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-square bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden">
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span class="text-4xl">🕉️</span>
                    </div>
                  </div>
                </div>
                <div class="p-5">
                  <h3 class="font-serif font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {model.name}
                  </h3>
                  <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 6 Picks Section */}
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-serif font-semibold text-gray-900">Top 6 picks</h2>
            <button class="text-sm text-orange-600 hover:text-orange-700 font-medium px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
              Show top 6 only
            </button>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topPicks.map((model) => (
              <div
                key={model.id}
                onClick$={$(() => {
                  selectedModel.value = model;
                  showModal.value = true;
                })}
                class="group bg-white border-2 border-orange-200/50 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 relative overflow-hidden">
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span class="text-4xl">🕉️</span>
                    </div>
                  </div>
                </div>
                <div class="p-5">
                  <h3 class="font-serif font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {model.name}
                  </h3>
                  <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explore All Section */}
        <div>
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-serif font-semibold text-gray-900">
              Explore all (45)
            </h2>
            <button class="text-sm text-orange-600 hover:text-orange-700 font-medium px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-2">
              <span>Show all</span>
            </button>
          </div>

          {/* Filters */}
          <div class="mb-6 flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <LuFilter class="w-4 h-4" />
              <span class="font-medium">Filter:</span>
            </div>
            {filters.map((filter) => (
              <button
                key={filter}
                onClick$={() => selectedFilter.value = filter}
                class={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  selectedFilter.value === filter
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-200'
                    : 'bg-white border-2 border-orange-200/50 text-gray-700 hover:border-orange-400 hover:shadow-md'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Explore All Grid */}
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredExploreAll.map((model) => (
              <div
                key={model.id}
                onClick$={$(() => {
                  selectedModel.value = model;
                  showModal.value = true;
                })}
                class="group bg-white border-2 border-orange-200/50 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div class="aspect-square bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden">
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <span class="text-4xl">🕉️</span>
                    </div>
                  </div>
                  {/* Category Badge */}
                  <div class="absolute top-3 left-3">
                    <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-orange-600 rounded-full border border-orange-200">
                      {model.category}
                    </span>
                  </div>
                </div>
                <div class="p-5">
                  <h3 class="font-serif font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {model.name}
                  </h3>
                  <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div class="mt-8 text-center">
            <button class="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:shadow-orange-300/50 hover:scale-105 transition-all duration-300">
              Load More Models
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal.value && selectedModel.value && (
        <>
          <style>
            {`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
              @keyframes scaleIn {
                from {
                  opacity: 0;
                  transform: scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              .animate-fade-in {
                animation: fadeIn 0.2s ease-out;
              }
              .animate-scale-in {
                animation: scaleIn 0.3s ease-out;
              }
            `}
          </style>
          <div 
            class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick$={$(() => {
              showModal.value = false;
              selectedModel.value = null;
            })}
          >
            <div 
              class="bg-white rounded-3xl max-w-2xl w-full p-8 relative animate-scale-in"
              onClick$={$((event) => {
                event.stopPropagation();
              })}
            >
            {/* Close Button */}
            <button
              onClick$={$(() => {
                showModal.value = false;
                selectedModel.value = null;
              })}
              class="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LuX class="w-6 h-6 text-gray-600" />
            </button>

            {/* Model Image */}
            <div class="flex justify-center mb-6">
              <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                <span class="text-5xl">🕉️</span>
              </div>
            </div>

            {/* Model Name */}
            <h2 class="text-2xl font-serif font-bold text-gray-900 text-center mb-3">
              {selectedModel.value.name}
            </h2>

            {/* Description */}
            <p class="text-gray-600 text-center mb-6 leading-relaxed">
              {selectedModel.value.description}
            </p>

            {/* Features Section */}
            {selectedModel.value.features && selectedModel.value.features.length > 0 && (
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Features</h3>
                <ul class="space-y-2">
                  {selectedModel.value.features.map((feature, index) => (
                    <li key={index} class="flex items-start gap-3">
                      <span class="text-orange-600 mt-1">•</span>
                      <span class="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prompts Section */}
            {selectedModel.value.prompts && selectedModel.value.prompts.length > 0 && (
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">
                  Prompts to start conversation with
                </h3>
                <div class="grid grid-cols-2 gap-3">
                  {selectedModel.value.prompts.map((prompt, index) => (
                    <button
                      key={index}
                      class="px-4 py-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-sm text-gray-700 text-left transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Chat Button */}
            <button class="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:shadow-orange-300/50 hover:scale-105 transition-all duration-300">
              Start chat
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Avatar Models - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Choose from 45+ personalized custom trained AI models',
    },
  ],
};
