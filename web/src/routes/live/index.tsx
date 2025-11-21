import { component$ } from '@builder.io/qwik';
import { routeLoader$, DocumentHead, Link } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';
import { LuPlay, LuClock, LuCalendar } from '@qwikest/icons/lucide';

/**
 * Server-side data loader
 * Fetches all live streams from Payload CMS with pagination
 */
export const useLiveStreamsLoader = routeLoader$(async ({ query }) => {
  const page = parseInt(query.get('page') || '1');

  try {
    // Fetch only public live streams from Payload CMS API
    const response = await payload.find({
      collection: 'live-streams',
      where: {
        visibility: {
          equals: 'public',
        },
      },
      limit: 12,
      page,
      depth: 1,
      sort: '-date', // Sort by date descending
    });

    return response;
  } catch (error) {
    console.error('Error fetching live streams:', error);
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
  const liveStreams = useLiveStreamsLoader();

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header Section */}
      <div class="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">Live Streams</h1>
          <p class="text-xl text-orange-100 max-w-3xl">
             Entraining, Entertaining, Enlightening! through live spiritual sessions and sacred teachings
          </p>
        </div>
      </div>

      {/* Live Streams Grid */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {liveStreams.value.docs.length === 0 ? (
          <div class="text-center py-16">
            <div class="text-6xl mb-4">📡</div>
            <h3 class="text-2xl font-bold text-gray-700 mb-2">No live streams found</h3>
            <p class="text-gray-500">Live streams will appear here once they are added to the CMS</p>
          </div>
        ) : (
          <>
            {/* Stream Count */}
            <div class="mb-8">
              <p class="text-gray-600">
                Showing {liveStreams.value.docs.length} of {liveStreams.value.totalDocs} live streams
              </p>
            </div>

            {/* Streams Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {liveStreams.value.docs.map((stream) => (
                <Link
                  key={stream.id}
                  href={`/live/${stream.streamKey}`}
                  class="group block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div class="relative aspect-video overflow-hidden bg-gray-200">
                    <img
                      src={stream.thumbnailUrl || '/placeholder-video.jpg'}
                      alt={stream.title}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <LuPlay class="w-16 h-16 text-white" />
                    </div>
                    {/* Live Badge */}
                    {stream.status === 'live' && (
                      <div class="absolute top-2 left-2 flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-semibold rounded-full shadow-lg">
                        <span class="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}
                    {/* Status Badge for non-live streams */}
                    {stream.status === 'ended' && (
                      <div class="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                        Ended
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div class="p-4">
                    <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {stream.title}
                    </h3>
                    {stream.description && (
                      <p class="text-sm text-gray-600 line-clamp-2 mb-3">
                        {stream.description}
                      </p>
                    )}
                    <div class="flex items-center gap-3 text-xs text-gray-500">
                      {stream.date && (
                        <div class="flex items-center gap-1">
                          <LuCalendar class="w-3 h-3" />
                          <span>
                            {new Date(stream.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {stream.visibility && (
                        <span class={`px-2 py-0.5 rounded-full ${
                          stream.visibility === 'public'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {stream.visibility}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {liveStreams.value.totalPages > 1 && (
              <div class="flex justify-center items-center gap-4">
                {liveStreams.value.hasPrevPage && (
                  <Link
                    href={`/live?page=${liveStreams.value.prevPage}`}
                    class="px-6 py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 hover:shadow-lg transition-all duration-300"
                  >
                    ← Previous
                  </Link>
                )}
                <span class="text-gray-700 font-medium">
                  Page {liveStreams.value.page} of {liveStreams.value.totalPages}
                </span>
                {liveStreams.value.hasNextPage && (
                  <Link
                    href={`/live?page=${liveStreams.value.nextPage}`}
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
  title: 'Live Streams - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Watch live darshan and sacred teachings from THE SPH NITHYANANDA PARAMASHIVAM.  Entraining, Entertaining, Enlightening! through live spiritual sessions.',
    },
  ],
};
