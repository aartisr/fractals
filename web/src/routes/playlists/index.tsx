import { component$, useSignal, $ } from '@builder.io/qwik';
import { DocumentHead, Link, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { LuSearch, LuClock, LuEye, LuChevronRight, LuExternalLink } from '@qwikest/icons/lucide';
import { payload } from '~/utils/payload-sdk';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';
import { VideoCard } from '~/components/ui/VideoCard';

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
  category: { id: number; name: string }[] | { id: number; name: string };
  views?: number;
  likes?: number;
}

interface Category {
  id: number;
  name: string;
  videos: Video[];
}

export const useCategories = routeLoader$(async ({ query }) => {
  const page = parseInt(query.get('page') || '1');
  const searchQuery = query.get('search') || undefined;
  const limit = 5; // Categories per page

  try {
    // Build where clause for category search
    const categoryWhere: any = {};
    if (searchQuery && searchQuery.trim()) {
      categoryWhere.name = { contains: searchQuery };
    }

    // Fetch categories with pagination
    const categoriesRes = await payload.find({
      collection: 'categories',
      limit,
      page,
      where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
      sort: 'name',
    });

    const categories: Category[] = [];

    // For each category, fetch first 4 videos (with optional search)
    for (const category of categoriesRes.docs) {
      const videoWhere: any = {
        category: {
          contains: category.id,
        },
      };

      // Add search filter for videos if search query exists
      if (searchQuery && searchQuery.trim()) {
        videoWhere.or = [
          { title: { contains: searchQuery } },
          { description: { contains: searchQuery } },
        ];
      }

      const videosRes = await payload.find({
        collection: 'videos',
        where: videoWhere,
        limit: 4,
        depth: 2,
        sort: '-date',
      });

      // Only include category if it has videos (when searching)
      if (!searchQuery || videosRes.docs.length > 0) {
        categories.push({
          id: category.id,
          name: category.name,
          videos: videosRes.docs as unknown as Video[],
        });
      }
    }

    return {
      categories,
      pagination: {
        page: categoriesRes.page,
        totalPages: categoriesRes.totalPages,
        hasNextPage: categoriesRes.hasNextPage,
        hasPrevPage: categoriesRes.hasPrevPage,
        nextPage: categoriesRes.nextPage,
        prevPage: categoriesRes.prevPage,
        totalDocs: categoriesRes.totalDocs,
      },
      searchQuery: searchQuery || '',
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      categories: [],
      pagination: {
        page: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
        totalDocs: 0,
      },
      searchQuery: searchQuery || '',
    };
  }
});

export default component$(() => {
  const categoriesData = useCategories();
  const searchQuery = useSignal(categoriesData.value?.searchQuery || '');
  const selectedVideo = useSignal<Video | null>(null);
  const showModal = useSignal(false);
  const nav = useNavigate();

  const categories: Category[] = categoriesData.value?.categories ?? [];
  const pagination = categoriesData.value?.pagination;

  const handleVideoClick = $((video: Video) => {
    selectedVideo.value = video;
    showModal.value = true;
  });

  const closeModal = $(() => {
    showModal.value = false;
    selectedVideo.value = null;
  });

  const handleSearch = $((e: Event) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.value.trim()) {
      params.set('search', searchQuery.value.trim());
    }
    nav(`/playlists?${params.toString()}`);
  });

  const formatViews = (views?: number) => {
    if (views === undefined || views === null) return '--';
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };


  return (
    <>
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* Header Section */}
        <div class="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 class="text-4xl md:text-5xl font-bold mb-4">Video Playlists</h1>
            <p class="text-xl text-orange-100 max-w-3xl mb-4">
              Explore our curated collection of spiritual teachings, wisdom, and transformative practices organized by category
            </p>
            {pagination && pagination.totalDocs > 0 && (
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm">
                <span class="font-semibold">{pagination.totalDocs}</span>
                <span>categories available</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <form onSubmit$={handleSearch} class="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div class="flex-1 w-full relative">
                <LuSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search playlists and videos..."
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={searchQuery.value}
                  onInput$={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
                />
              </div>

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-lg hover:shadow-lg transition-all whitespace-nowrap"
                >
                  Search
                </button>
                {searchQuery.value && (
                  <button
                    type="button"
                    onClick$={() => {
                      searchQuery.value = '';
                      nav('/playlists');
                    }}
                    class="px-6 py-3 border-2 border-orange-300 text-orange-700 font-medium rounded-lg hover:bg-orange-50 transition-all whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Browse All Link */}
              <Link
                href="/explore"
                class="flex items-center gap-2 px-6 py-3 bg-white border-2 border-orange-300 text-orange-700 font-medium rounded-lg hover:bg-orange-50 transition-all whitespace-nowrap"
              >
                Browse All Videos
                <LuChevronRight class="w-4 h-4" />
              </Link>
            </form>
          </div>

          {/* Categories with Videos */}
          <div class="space-y-12">
            {categories.map((category) => (
              <div key={category.id} class="space-y-4">
                {/* Category Header */}
                <div class="flex items-center justify-between">
                  <h2 class="text-2xl font-bold text-gray-900">{category.name}</h2>
                  <Link
                    href={`/explore?category=${category.id}`}
                    class="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-1"
                  >
                    View All
                    <LuChevronRight class="w-4 h-4" />
                  </Link>
                </div>

                {/* Videos Grid */}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {category.videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onVideoClick={handleVideoClick}
                      size="small"
                    />
                  ))}
                </div>

                {/* Show message if no videos in category */}
                {category.videos.length === 0 && (
                  <div class="text-center py-8 text-gray-500">
                    No videos in this category yet
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results */}
          {categories.length === 0 && (
            <div class="text-center py-16">
              <div class="text-6xl mb-4">🔍</div>
              <h3 class="text-2xl font-bold text-gray-700 mb-2">No results found</h3>
              <p class="text-gray-500">{searchQuery.value ? 'Try adjusting your search query' : 'No playlists available'}</p>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div class="mt-12 pt-8 border-t border-orange-200">
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page Info */}
                <div class="text-gray-600 text-sm">
                  Showing page {pagination.page} of {pagination.totalPages}
                  <span class="hidden sm:inline"> ({pagination.totalDocs} categories total)</span>
                </div>

                {/* Navigation Buttons */}
                <div class="flex items-center gap-3">
                  {pagination.hasPrevPage && (
                    <Link
                      href={`/playlists?page=${pagination.prevPage}${searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''}`}
                      class="px-6 py-3 bg-white border-2 border-orange-300 text-orange-700 font-medium rounded-xl hover:bg-orange-50 hover:border-orange-400 hover:shadow-lg transition-all duration-300"
                    >
                      ← Previous
                    </Link>
                  )}

                  {/* Page Numbers */}
                  <div class="hidden md:flex items-center gap-2">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      const page = pagination.page ?? 1;
                      const totalPages = pagination.totalPages ?? 1;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Link
                          key={pageNum}
                          href={`/playlists?page=${pageNum}${searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''}`}
                          class={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-all ${
                            pageNum === pagination.page
                              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}
                  </div>

                  {pagination.hasNextPage && (
                    <Link
                      href={`/playlists?page=${pagination.nextPage}${searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''}`}
                      class="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Modal with Quick Preview */}
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
                  <span class="text-2xl">&times;</span>
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

                {/* Open Full Page Button */}
                <div class="mb-6">
                  <Link
                    href={`/videos/${selectedVideo.value.videoId}`}
                    class="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                  >
                    <LuExternalLink class="w-5 h-5" />
                    Play
                  </Link>
                </div>

                {/* Video Info */}
                <div class="space-y-4">
                  <div>
                    <div class="flex flex-wrap gap-2 mb-2">
                      {(Array.isArray(selectedVideo.value.category)
                        ? selectedVideo.value.category
                        : [selectedVideo.value.category]
                      ).map((cat) => (
                        <span key={cat.id} class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">
                          {cat.name}
                        </span>
                      ))}
                    </div>
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
                      <span>{formatDate(selectedVideo.value.date)}</span>
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
  title: 'Video Playlists - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Explore our curated collection of spiritual teachings, wisdom, and transformative practices from THE SPH NITHYANANDA PARAMASHIVAM organized by category.',
    },
  ],
};
