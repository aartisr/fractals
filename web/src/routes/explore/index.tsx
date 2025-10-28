import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import { DocumentHead, Link, routeLoader$, useLocation } from '@builder.io/qwik-city';
import { LuSearch, LuPlay, LuClock, LuEye, LuLogIn, LuShield, LuFilter, LuX } from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';
import { payload } from '~/utils/payload-sdk';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';

interface Video {
  id: number;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  masterUrl: string;
  playlists: { resolution: string; url: string }[];
  duration: string;
  date: string;
  category: { id: number; name: string };
  views?: number;
  likes?: number;
}

interface Category {
  id: number;
  name: string;
}

export const useVideos = routeLoader$(async () => {
  const res = await payload.find({
    collection: 'videos',
    limit: 100, // Fetch all videos (adjust limit as needed)
    depth: 2,
  });
  return res.docs as unknown as Video[];
});

export const useCategories = routeLoader$(async () => {
  const res = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'name',
  });
  return res.docs as unknown as Category[];
});

export default component$(() => {
  const userContext = useUserContext();
  const videosData = useVideos();
  const categoriesData = useCategories();
  const location = useLocation();

  const searchQuery = useSignal('');
  const selectedVideo = useSignal<Video | null>(null);
  const showModal = useSignal(false);
  const selectedCategory = useSignal<number | null>(null);
  const showFilterPanel = useSignal(false);

  // Set initial category from URL query param
  useTask$(({ track }) => {
    track(() => location.url.searchParams);
    const categoryParam = location.url.searchParams.get('category');
    if (categoryParam) {
      selectedCategory.value = parseInt(categoryParam);
    }
  });

  // Protección de ruta: requiere autenticación
  if (!userContext.value.isAuthenticated) {
    return (
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100">
        <div class="max-w-md w-full space-y-8 relative text-center">
          <div class="inline-flex w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div class="absolute inset-0 bg-orange-500 blur-2xl opacity-30 rounded-full"></div>
            <LuShield class="w-10 h-10 text-white relative z-10" />
          </div>
            <h2 class="text-4xl font-semibold tracking-tight text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p class="text-gray-600 mb-8">
            Please sign in to access the sacred video library and teachings
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

  const videos: Video[] = videosData.value ?? [];
  const categories: Category[] = categoriesData.value ?? [];

  const handleVideoClick = $((video: Video) => {
    selectedVideo.value = video;
    showModal.value = true;
  });

  const closeModal = $(() => {
    showModal.value = false;
    selectedVideo.value = null;
  });

  const formatViews = (views?: number) => {
    if (views === undefined || views === null) return '--';
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Filter videos
  const getFilteredVideos = () => {
    let result = videos;

    // Filter by category
    if (selectedCategory.value !== null) {
      result = result.filter(video => video.category.id === selectedCategory.value);
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.category.name.toLowerCase().includes(query)
      );
    }

    return result;
  };

  return (
    <>
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* Header Section */}
        <div class="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 class="text-4xl md:text-5xl font-bold mb-4">Explore All Videos</h1>
            <p class="text-xl text-orange-100 max-w-3xl">
              Browse our complete library of spiritual teachings and divine wisdom
            </p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <div class="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div class="flex-1 relative">
                <LuSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search all videos..."
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={searchQuery.value}
                  onInput$={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
                />
              </div>

              {/* Filter Button */}
              <button
                onClick$={() => showFilterPanel.value = !showFilterPanel.value}
                class="flex items-center gap-2 px-6 py-3 border-2 border-orange-300 bg-white hover:bg-orange-50 rounded-lg transition-all font-medium text-gray-700"
              >
                <LuFilter class="w-5 h-5" />
                Filters
                {selectedCategory.value !== null && (
                  <span class="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">1</span>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilterPanel.value && (
              <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">Filter by Category</h3>
                  {selectedCategory.value !== null && (
                    <button
                      onClick$={() => selectedCategory.value = null}
                      class="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div class="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick$={() => {
                        selectedCategory.value = selectedCategory.value === category.id ? null : category.id;
                      }}
                      class={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedCategory.value === category.id
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div class="mb-6">
            <p class="text-gray-600">
              Showing <span class="font-semibold text-gray-900">{getFilteredVideos().length}</span> video{getFilteredVideos().length !== 1 ? 's' : ''}
              {selectedCategory.value !== null && (
                <span> in <span class="font-semibold text-orange-600">
                  {categories.find(c => c.id === selectedCategory.value)?.name}
                </span></span>
              )}
            </p>
          </div>

          {/* Videos Grid */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredVideos().map((video) => (
              <div
                key={video.id}
                class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick$={() => handleVideoClick(video)}
              >
                {/* Thumbnail */}
                <div class="relative aspect-video overflow-hidden bg-gray-200">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <LuPlay class="w-16 h-16 text-white" />
                  </div>
                  <div class="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm">
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div class="p-4">
                  <div class="mb-2">
                    <span class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                      {video.category.name}
                    </span>
                  </div>
                  <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {video.title}
                  </h3>
                  <p class="text-gray-600 text-sm line-clamp-2 mb-3">
                    {video.description}
                  </p>
                  <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center gap-4">
                      <span class="flex items-center gap-1">
                        <LuEye class="w-4 h-4" />
                        {formatViews(video.views)}
                      </span>
                    </div>
                    <span class="text-xs">{video.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {getFilteredVideos().length === 0 && (
            <div class="text-center py-16">
              <div class="text-6xl mb-4">🔍</div>
              <h3 class="text-2xl font-bold text-gray-700 mb-2">No videos found</h3>
              <p class="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* Video Modal */}
        {showModal.value && selectedVideo.value && (
          <div
            class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick$={closeModal}
          >
            <div
              class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick$={(e) => e.stopPropagation()}
            >
              <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 class="text-2xl font-bold text-gray-900 line-clamp-1">
                  {selectedVideo.value.title}
                </h2>
                <button
                  onClick$={closeModal}
                  class="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <LuX class="w-6 h-6" />
                </button>
              </div>

              <div class="p-6">
                {/* Video Player */}
                <div class="aspect-video bg-black rounded-lg mb-6 overflow-hidden">
                  <VideoJSPlayer
                    sources={(() => {
                      const sources = [];

                      // Add master playlist
                      if (selectedVideo.value.masterUrl) {
                        sources.push({
                          src: selectedVideo.value.masterUrl,
                          type: 'application/x-mpegURL',
                          label: 'Auto'
                        });
                      }

                      // Add quality-specific playlists
                      if (selectedVideo.value.playlists) {
                        for (const playlist of selectedVideo.value.playlists) {
                          if (playlist?.url) {
                            sources.push({
                              src: playlist.url,
                              type: 'application/x-mpegURL',
                              label: playlist.resolution || 'Unknown',
                              res: playlist.resolution ? parseInt(playlist.resolution) : undefined
                            });
                          }
                        }
                      }

                      return sources;
                    })()}
                    poster={selectedVideo.value.thumbnail}
                    autoplay={true}
                    muted={false}
                  />
                </div>

                {/* Video Info */}
                <div class="space-y-4">
                  <div>
                    <span class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-2">
                      {selectedVideo.value.category.name}
                    </span>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">
                      {selectedVideo.value.title}
                    </h3>
                    <div class="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span class="flex items-center gap-1">
                        <LuEye class="w-4 h-4" />
                        {formatViews(selectedVideo.value.views)} views
                      </span>
                      <span class="flex items-center gap-1">
                        <LuClock class="w-4 h-4" />
                        {selectedVideo.value.duration}
                      </span>
                      <span>{selectedVideo.value.date}</span>
                    </div>
                  </div>

                  <div class="border-t border-gray-200 pt-4">
                    <h4 class="font-semibold text-gray-900 mb-2">Description</h4>
                    <p class="text-gray-700 whitespace-pre-line">
                      {selectedVideo.value.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Explore All Videos - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Browse our complete library of spiritual teachings, divine wisdom, and transformative practices from Paramahamsa Nithyananda',
    },
  ],
};
