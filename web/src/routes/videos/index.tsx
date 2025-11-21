import { component$ } from '@builder.io/qwik';
import { routeLoader$, DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { LuPlay, LuClock, LuEye, LuHeart } from '@qwikest/icons/lucide';

/**
 * Server-side data loader
 * Fetches all videos from Payload CMS with pagination
 */
export const useVideosLoader = routeLoader$(async ({ query }) => {
  const page = parseInt(query.get('page') || '1');
  const categoryId = query.get('category') || undefined;

  // Build where clause for category filter
  const where = categoryId ? { category: { equals: categoryId } } : undefined;

  try {
    // Fetch videos from Payload CMS API
    const response = await payload.find({
      collection: 'videos',
      limit: 12,
      page,
      where,
      depth: 1, // Populate category relationship
      sort: '-date', // Sort by date descending
    });

    return response;
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
    };
  }
});

export default component$(() => {
  const videos = useVideosLoader();

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

      {/* Videos Grid */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                Showing {videos.value.docs.length} of {videos.value.totalDocs} videos
              </p>
            </div>

            {/* Videos Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {videos.value.docs.map((video) => (
                <Link
                  key={video.id}
                  href={`/videos/${video.videoId}`}
                  class="group block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div class="relative aspect-video overflow-hidden bg-gray-200">
                    <img
                      src={video.thumbnail || '/placeholder-video.jpg'}
                      alt={video.title}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <LuPlay class="w-16 h-16 text-white" />
                    </div>
                    {video.duration && (
                      <div class="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm">
                        {video.duration}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div class="p-4">
                    {typeof video.category === 'object' && video.category && (
                      <div class="mb-2">
                        <span class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          {video.category.name}
                        </span>
                      </div>
                    )}
                    <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p class="text-sm text-gray-600 line-clamp-2 mb-3">
                        {video.description}
                      </p>
                    )}
                    {video.date && (
                      <div class="text-xs text-gray-500">
                        {new Date(video.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {videos.value.totalPages > 1 && (
              <div class="flex justify-center items-center gap-4">
                {videos.value.hasPrevPage && (
                  <Link
                    href={`/videos?page=${videos.value.prevPage}`}
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
                    href={`/videos?page=${videos.value.nextPage}`}
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
