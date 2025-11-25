import { component$, useSignal, $ } from '@builder.io/qwik';
import { routeLoader$, DocumentHead, Link, useNavigate } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { LuClock, LuEye, LuExternalLink, LuSearch } from '@qwikest/icons/lucide';
import { VideoCard } from '~/components/ui/VideoCard';
import { VideoJSPlayer } from '~/components/ui/VideoJSPlayer';

/**
 * Server-side data loader
 * Fetches all videos from Payload CMS with pagination
 */
export const useVideosLoader = routeLoader$(async ({ query }) => {
  const page = parseInt(query.get('page') || '1');
  const categoryId = query.get('category') || undefined;
  const searchQuery = query.get('search') || undefined;

  // Build where clause for filters
  const where: any = {};

  if (categoryId) {
    where.category = { equals: categoryId };
  }

  // Add search filter using Payload's 'or' operator
  if (searchQuery && searchQuery.trim()) {
    where.or = [
      { title: { contains: searchQuery } },
      { description: { contains: searchQuery } },
    ];
  }

  try {
    // Fetch videos from Payload CMS API
    const response = await payload.find({
      collection: 'videos',
      limit: 12,
      page,
      where: Object.keys(where).length > 0 ? where : undefined,
      depth: 1, // Populate category relationship
      sort: '-date', // Sort by date descending
    });

    return {
      ...response,
      searchQuery: searchQuery || '',
    };
  } catch (error) {
    console.error('Error fetching videos:', error);
    return {
      docs: [],
      totalDocs: 0,
      limit: 12,
      totalPages: 0,
      page: 1,
      pagingCounter: 1,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
      searchQuery: searchQuery || '',
    };
  }
});

export default component$(() => {
  const videos = useVideosLoader();
  const selectedVideo = useSignal<any>(null);
  const showModal = useSignal(false);
  const searchQuery = useSignal(videos.value.searchQuery || '');
  const nav = useNavigate();

  const handleVideoClick = $((video: any) => {
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
    nav(`/videos?${params.toString()}`);
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
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header Section */}
      <div class="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">All Videos</h1>
          <p class="text-xl text-orange-100 max-w-3xl">
            Explore our complete collection of spiritual teachings and divine wisdom
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit$={handleSearch} class="bg-white rounded-xl shadow-md p-6 mb-8">
          <div class="flex gap-4">
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
            <button
              type="submit"
              class="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Search
            </button>
            {searchQuery.value && (
              <button
                type="button"
                onClick$={() => {
                  searchQuery.value = '';
                  nav('/videos');
                }}
                class="px-6 py-3 border-2 border-orange-300 text-orange-700 font-medium rounded-lg hover:bg-orange-50 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Videos Grid */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {videos.value.docs.length === 0 ? (
          <div class="text-center py-16">
            <div class="text-6xl mb-4">📹</div>
            <h3 class="text-2xl font-bold text-gray-700 mb-2">No videos found</h3>
            <p class="text-gray-500">Videos will appear here once they are added to the CMS</p>
          </div>
        ) : (
          <>
            {/* Video Count */}
            <div class="mb-8">
              <p class="text-gray-600">
                {videos.value.searchQuery ? (
                  <>Found {videos.value.totalDocs} video{videos.value.totalDocs !== 1 ? 's' : ''} matching "{videos.value.searchQuery}"</>
                ) : (
                  <>Showing {videos.value.docs.length} of {videos.value.totalDocs} videos</>
                )}
              </p>
            </div>

            {/* Videos Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {videos.value.docs.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onVideoClick={handleVideoClick}
                  size="medium"
                />
              ))}
            </div>

            {/* Pagination */}
            {videos.value.totalPages > 1 && (
              <div class="flex justify-center items-center gap-4">
                {videos.value.hasPrevPage && (
                  <Link
                    href={`/videos?page=${videos.value.prevPage}${videos.value.searchQuery ? `&search=${encodeURIComponent(videos.value.searchQuery)}` : ''}`}
                    class="px-6 py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 hover:shadow-lg transition-all duration-300"
                  >
                    ← Previous
                  </Link>
                )}
                <span class="text-gray-700 font-medium">
                  Page {videos.value.page} of {videos.value.totalPages}
                </span>
                {videos.value.hasNextPage && (
                  <Link
                    href={`/videos?page=${videos.value.nextPage}${videos.value.searchQuery ? `&search=${encodeURIComponent(videos.value.searchQuery)}` : ''}`}
                    class="px-6 py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 hover:shadow-lg transition-all duration-300"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
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
                  {selectedVideo.value.category && (
                    <span class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-2">
                      {typeof selectedVideo.value.category === 'object'
                        ? selectedVideo.value.category.name
                        : selectedVideo.value.category}
                    </span>
                  )}
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
  );
});

export const head: DocumentHead = {
  title: 'All Videos - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Browse our complete collection of spiritual teachings and transformative wisdom from THE SPH NITHYANANDA PARAMASHIVAM.',
    },
  ],
};
