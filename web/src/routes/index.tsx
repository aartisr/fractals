import { component$ } from '@builder.io/qwik';
import { DocumentHead, Link, routeLoader$ } from '@builder.io/qwik-city';
import {
  LuPlay,
  LuCalendar,
  LuUsers,
  LuClock,
  LuSparkles,
  LuMessageCircle,
} from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';
import { payload } from '~/utils/payload-sdk';

export const useHomeData = routeLoader$(async () => {
  try {
    // Fetch total videos count
    const videosRes = await payload.find({
      collection: 'videos',
      limit: 1,
    });

    // Fetch all live streams (public ones - live, idle, and ended)
    const liveStreamsRes = await payload.find({
      collection: 'live-streams',
      where: {
        visibility: {
          equals: 'public',
        },
      },
      limit: 3,
      sort: '-date',
    });

    // Fetch categories with video counts for playlists
    const categoriesRes = await payload.find({
      collection: 'categories',
      limit: 4,
      sort: 'name',
    });

    const categoriesWithVideos = await Promise.all(
      (categoriesRes?.docs ?? []).map(async (category: any) => {
        const videosRes = await payload.find({
          collection: 'videos',
          where: {
            category: {
              equals: category.id,
            },
          },
          limit: 1,
        });

        // Get first video for thumbnail
        const firstVideo = (videosRes?.docs ?? [])[0] as any;

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          count: videosRes?.totalDocs ?? 0,
          image: firstVideo?.thumbnail || 'https://images.unsplash.com/photo-1602192509154-0b900ee1f851?w=400&q=80',
        };
      })
    );

    return {
      totalVideos: videosRes?.totalDocs || 0,
      liveStreams: liveStreamsRes?.docs || [],
      categories: categoriesWithVideos || [],
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      totalVideos: 0,
      liveStreams: [],
      categories: [],
    };
  }
});

export default component$(() => {
  const userContext = useUserContext();
  const homeData = useHomeData();

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return num.toString();
  };

  // Find the first active live stream
  const activeLiveStream = homeData.value.liveStreams.find(
    (stream: any) => stream.status === 'live'
  );

  return (
    <>
      {/* Hero Section */}
      <div class="pt-0 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
          <div 
            class="absolute inset-0 pointer-events-none"
            style="background-image: radial-gradient(circle at center, rgba(251, 146, 60, 0.06) 0%, transparent 70%);"
          ></div>
          
          <div class="grid lg:grid-cols-2 gap-12 items-center relative">
            {/* LOTUS CSS ILLUSTRATION */}
            <div class="relative" style="animation: float 6s ease-in-out infinite;">
              <div class="pointer-events-none absolute -z-10 -left-10 -top-8 w-[360px] h-[360px] opacity-50">
                {/* Lotus base circle */}
                <div 
                  class="absolute inset-0 rounded-full" 
                  style="background: radial-gradient(circle at 50% 55%, rgba(251,146,60,0.18), rgba(251,146,60,0.06) 45%, transparent 60%); filter: blur(0.2px);"
                ></div>
                {/* 12 Petals */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((rotation) => (
                  <div 
                    key={rotation}
                    class="absolute left-1/2 top-1/2" 
                    style={`width:120px;height:180px;transform: translate(-50%,-50%) rotate(${rotation}deg) translateY(-70px); transform-origin:center bottom; border-radius:60px 60px 60px 60px / 90px 90px 60px 60px; background: radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.6) 0%, rgba(253,186,116,0.55) 35%, rgba(234,88,12,0.25) 70%, rgba(234,88,12,0.0) 80%); box-shadow: 0 6px 16px rgba(234,88,12,0.08);`}
                  ></div>
                ))}
                {/* Lotus center */}
                <div 
                  class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-28 h-28 border border-orange-300/50" 
                  style="background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(253,186,116,0.6) 55%, rgba(251,146,60,0.3) 75%, rgba(251,146,60,0.0) 85%); backdrop-filter: blur(0.5px);"
                ></div>
              </div>

              {activeLiveStream && (
                <Link
                  href={`/live/${activeLiveStream.streamKey}`}
                  class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-full mb-8 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer"
                >
                  <span class="w-2 h-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full animate-pulse"></span>
                  <span class="tracking-wide font-semibold">LIVE DARSHAN NOW</span>
                </Link>
              )}

              <h1 class="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-transparent bg-gradient-to-br from-orange-800 via-orange-600 to-amber-600 bg-clip-text mb-6 leading-tight">
                 Entraining, Entertaining, Enlightening!
              </h1>
              
              <p class="text-lg text-gray-700 mb-8 leading-relaxed font-light">
                 
              </p>
              
              <div class="flex flex-wrap items-center gap-4">
                <Link
                  href="/playlists"
                  class="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  style="animation: pulse-glow 3s ease-in-out infinite;"
                >
                  <LuPlay class="w-5 h-5" />
                  Begin Your Journey
                </Link>
              </div>

              <div class="mt-12 flex items-center gap-8 text-sm">
                <div class="flex items-center gap-2">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center border border-orange-200">
                    <span class="text-orange-700 font-bold">{formatNumber(homeData.value.totalVideos)}</span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">Videos</div>
                    <div class="text-xs text-gray-500">Available on Demand</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 blur-3xl opacity-20 rounded-3xl"></div>
              <div class="relative aspect-[4/5] bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
                <img
                  src="/images/featured-live.jpg"
                  alt="SPH Nithyananda"
                  class="w-full h-full object-cover"
                  width={800}
                  height={1000}
                />
                <div class="absolute inset-0 bg-gradient-to-t from-orange-900/30 via-transparent to-transparent"></div>
              </div>
              <div class="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full opacity-10 blur-2xl"></div>
              <div class="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full opacity-10 blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* SPH LIVE Section */}
      <div class="bg-gradient-to-br from-white to-orange-50/50 border-y border-orange-200/50 py-16 lg:py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12 relative">
            {/* TRIDENT CSS ILLUSTRATION */}
            <div class="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 opacity-70">
              <div class="relative w-10 h-14">
                <div class="absolute left-1/2 -translate-x-1/2 top-4 w-[2px] h-9 rounded-full" style="background: linear-gradient(to bottom, rgba(234,88,12,0.8), rgba(245,158,11,0.7));"></div>
                <div class="absolute left-1/2 -translate-x-1/2 top-0" style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid rgba(234,88,12,0.85);"></div>
                <div class="absolute left-[18%] top-2 rotate-12" style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid rgba(245,158,11,0.8);"></div>
                <div class="absolute right-[18%] top-2 -rotate-12" style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid rgba(245,158,11,0.8);"></div>
                <div class="absolute left-1/2 -translate-x-1/2 top-[34px] w-8 h-[2px] rounded-full" style="background: linear-gradient(to right, rgba(245,158,11,0.7), rgba(234,88,12,0.7));"></div>
                <div class="absolute left-1/2 -translate-x-1/2 top-[28px] w-2 h-2 rounded-full" style="background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(251,146,60,0.6));"></div>
              </div>
            </div>

            <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 border border-red-200 text-red-700 text-xs font-medium rounded-full mb-4">
              <span class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              <span class="font-medium tracking-wide">SACRED LIVE STREAMS</span>
            </div>
            <h2 class="text-4xl font-medium font-semibold tracking-tight text-gray-900 mb-3">SPH LIVE Darshan</h2>
            <p class="text-gray-600 max-w-2xl mx-auto">Connect with divine consciousness through live spiritual sessions</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeData.value.liveStreams.length > 0 ? homeData.value.liveStreams.map((stream: any) => (
              <Link key={stream.id} href={`/live/${stream.streamKey}`} class="bg-white rounded-2xl overflow-hidden border-2 border-orange-200/50 hover:border-orange-400 hover:shadow-2xl transition-all duration-300 group cursor-pointer">
                <div class="aspect-video bg-gradient-to-br from-orange-100 to-amber-50 relative">
                  <img
                    src={stream.thumbnailUrl || '/images/featured-live.jpg'}
                    alt={stream.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    width={600}
                    height={338}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div class="p-6">
                  <div class="flex items-center justify-between mb-3">
                    {stream.status === 'live' ? (
                      <div class="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-medium rounded-lg flex items-center gap-2">
                        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE NOW
                      </div>
                    ) : stream.status === 'idle' ? (
                      <div class="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs font-medium rounded-lg">
                        UPCOMING
                      </div>
                    ) : (
                      <div class="px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 text-white text-xs font-medium rounded-lg">
                        ENDED
                      </div>
                    )}
                    <span class="text-orange-600 hover:text-orange-700 font-medium text-sm">
                      {stream.status === 'live' ? 'Watch Now' : stream.status === 'idle' ? 'Details' : 'Watch Replay'}
                    </span>
                  </div>
                  <div class="flex items-center text-sm text-gray-600">
                    <span class="flex items-center gap-1.5">
                      <LuClock class="w-4 h-4" />
                      {stream.title}
                    </span>
                  </div>
                </div>
              </Link>
            )) : (
              <div class="col-span-full text-center py-12 text-gray-500">
                No streams available at the moment. Check back soon!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Playlists */}
      <div 
        class="py-16 lg:py-20 relative"
        style="background-image: radial-gradient(circle at center, rgba(251, 146, 60, 0.03) 0%, transparent 70%);"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 text-amber-700 text-xs font-medium rounded-full mb-4">
              <LuSparkles class="w-3 h-3" />
              <span class="font-medium tracking-wide">CURATED COLLECTIONS</span>
            </div>
            <h2 class="text-4xl font-medium font-semibold tracking-tight text-gray-900 mb-3">Curated Playlists</h2>
            <p class="text-gray-600 max-w-2xl mx-auto">Journey through curated paths of spiritual awakening</p>
          </div>
          
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {homeData.value.categories.length > 0 ? homeData.value.categories.map((category: any) => (
              <Link key={category.id} href="/playlists" class="group cursor-pointer">
                <div class="aspect-square bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-2xl overflow-hidden mb-4 relative border-2 border-orange-200/50 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <img
                    src={category.image}
                    alt={category.name}
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    width={400}
                    height={400}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-orange-900/80 via-orange-900/20 to-transparent"></div>
                  <div class="absolute bottom-4 left-4 right-4">
                    <div class="flex items-center gap-2 text-white mb-2">
                      <div class="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/50">
                        <LuPlay class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-medium">Video Series</span>
                    </div>
                  </div>
                </div>
                <h3 class="font-medium font-medium text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{category.name}</h3>
                <p class="text-sm text-gray-600">{category.description || 'Explore this collection'}</p>
              </Link>
            )) : (
              <div class="col-span-4 text-center py-12 text-gray-500">
                No playlists available at the moment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask Nithyananda Feature */}
      <div class="relative overflow-hidden py-20 lg:py-28">
        <div class="absolute inset-0 bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600"></div>
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div class="inline-flex w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl items-center justify-center mx-auto mb-8 border-2 border-white/50 shadow-2xl">
            <LuMessageCircle class="w-10 h-10 text-white" />
          </div>
          <h2 class="text-4xl lg:text-5xl font-medium font-semibold tracking-tight text-white mb-6">Ask Nithyananda</h2>
          <p class="text-lg text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Dive deeper into spiritual wisdom with our divine AI assistant. Get instant insights and guidance about the teachings you're exploring.
          </p>
          <Link 
            href="/ask"
            class="px-8 py-4 bg-white text-orange-700 font-medium rounded-xl hover:bg-orange-50 hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
          >
            <LuSparkles class="w-5 h-5" />
            <span class="font-medium">Begin Sacred Dialogue</span>
          </Link>
          <div class="mt-12 flex items-center justify-center gap-12 text-white/90">
            <div>
              <div class="text-3xl font-medium font-semibold">10K+</div>
              <div class="text-sm text-white/70">Questions Answered</div>
            </div>
            <div class="w-px h-12 bg-white/30"></div>
            <div>
              <div class="text-3xl font-medium font-semibold">24/7</div>
              <div class="text-sm text-white/70">Always Available</div>
            </div>
            <div class="w-px h-12 bg-white/30"></div>
            <div>
              <div class="text-3xl font-medium font-semibold">∞</div>
              <div class="text-sm text-white/70">Divine Wisdom</div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
});

export const head: DocumentHead = {
  title: 'Nithyananda TV - KAILASA\'s Web Television',
  meta: [
    {
      name: 'description',
      content: ' Entraining, Entertaining, Enlightening! through sacred teachings of THE SPH NITHYANANDA PARAMASHIVAM. Access thousands of enlightening discourses, live darshans, and transformative spiritual practices.',
    },
    {
      property: 'og:title',
      content: 'Nithyananda TV - KAILASA\'s Web Television',
    },
    {
      property: 'og:description',
      content: ' Entraining, Entertaining, Enlightening! through sacred teachings of THE SPH NITHYANANDA PARAMASHIVAM. Access thousands of enlightening discourses, live darshans, and transformative spiritual practices.',
    },
  ],
};
