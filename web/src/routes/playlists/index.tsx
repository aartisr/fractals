import { component$, useSignal, $ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { LuSearch, LuFilter, LuX, LuPlay, LuClock, LuEye, LuLogIn, LuShield } from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  masterUrl: string;
  url1080p: string;
  url720p: string;
  duration: string;
  views: number;
  likes: number;
  date: string;
  category: string;
}

export default component$(() => {
  const userContext = useUserContext();
  const searchQuery = useSignal('');
  const selectedFilter = useSignal('All');
  const selectedVideo = useSignal<Video | null>(null);
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


  const filters = [
    'All',
    'Be Unclutched',
    'eN Wealth',
    'Nithya Kriya: Care & Cure',
    'Webinars'
  ];

  const videos: Video[] = [
    {
      id: 's8Rxj5Ra9yA',
      title: 'Unclutching®: la técnica decisiva para la iluminación',
      description: 'Los pensamientos son como burbujas en una pecera. De la misma forma que suben las burbujas desde el fondo, así también ascienden nuestros pensamientos. Cuando una burbuja llega a la superficie del agua otra empieza a subir y una tercera más aparece. Como las burbujas se mueven rápidamente, dan la sensación de ser una línea continua. Pero nuestra mente ¡no es una línea continua! Siempre hay un hueco entre dos pensamientos. Al igual que las burbujas, nosotros también experimentamos un espacio neutro entre dos pensamientos. Este espacio neutro entre dos pensamientos es nuestro estado original -- el silencio puro. Es el estado de Pura Conciencia- El Estado de DIOS',
      thumbnail: 'https://ntv-cms.nithyananda.ai/s8Rxj5Ra9yA/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/s8Rxj5Ra9yA/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/s8Rxj5Ra9yA/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/s8Rxj5Ra9yA/720p/playlist.m3u8',
      duration: '00:09:17',
      views: 5852,
      likes: 85,
      date: '07 May 2012',
      category: 'Be Unclutched'
    },
    {
      id: 'RCTQaRU8FDU',
      title: 'Consciousness is Always Expanding - Q and A Session, Unclutch® Discourse Part 4',
      description: 'In this video Swamiji explains consciousness and its role in unclutching®. Swamiji explains that the ultimate is not final, which means that although unclutching® is the ultimate solution, it is a continuous practice. From the space of unclutching® we can be constantly expanding and embodying the space of living enlightenment, being unclutched®.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/RCTQaRU8FDU/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/RCTQaRU8FDU/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/RCTQaRU8FDU/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/RCTQaRU8FDU/720p/playlist.m3u8',
      duration: '00:22:49',
      views: 4604,
      likes: 151,
      date: '25 Feb 2008',
      category: 'Be Unclutched'
    },
    {
      id: 'r1oSyAOXirM',
      title: 'Be Unclutched® Vol 1',
      description: 'Experience Unclutching® through Inner Awakening. From the works of Living Enlightened master Paramahamsa Nithyananda. This clip is taken from the discourse titled, "Unclutching® -- De-program the inner self" delivered during the third day of the first Nithya Dhyan mass satsang held in Bangalore in December 2007.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/r1oSyAOXirM/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/r1oSyAOXirM/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/r1oSyAOXirM/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/r1oSyAOXirM/720p/playlist.m3u8',
      duration: '00:56:23',
      views: 122915,
      likes: 1398,
      date: '03 Dec 2007',
      category: 'Be Unclutched'
    },
    {
      id: 'R-K3bvvdMYg',
      title: 'What is Advaitic Enthusiasm | Nithyananda Satsang',
      description: 'Only when you re-write your future with advaithic enthusiasm your past becomes irrelevant. Enriching gives you the new possibility, the new future and all the dirt of your past disappears. Thinking that you are right or wrong is an irrelevant waste of time. Enthusiasm arising from advaitha is Jeevan Muktha.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/R-K3bvvdMYg/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/R-K3bvvdMYg/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/R-K3bvvdMYg/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/R-K3bvvdMYg/720p/playlist.m3u8',
      duration: '00:27:51',
      views: 1895,
      likes: 59,
      date: '25 Jul 2014',
      category: 'Be Unclutched'
    },
    {
      id: 'qbBvTn966XM',
      title: 'Yoga Sutras Discourse: Decide to Unclutch® & Drop Your Mind Now',
      description: 'From the works of Living Enlightened Master Paramahamsa Nithyananda. In this clip taken from Patanjali Yoga Sutras discourse 11 (Sutra 14), Swamiji sheds more light on the deeper secrets about body and mind.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/qbBvTn966XM/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/qbBvTn966XM/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/qbBvTn966XM/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/qbBvTn966XM/720p/playlist.m3u8',
      duration: '00:24:24',
      views: 18542,
      likes: 211,
      date: '08 Apr 2009',
      category: 'Be Unclutched'
    },
    {
      id: 'PhkWeoi4Cdg',
      title: 'Be Unclutched®, Be Blissful! | Nithyananda Satsang',
      description: 'THE WHOLE ESSENCE OF KAPILA MAHARISHI BHAGAVAN\'S SANKHYA PHILOSOPHY IS: ABSOLUTE UNCLUTCHING®. BUILDING YOUR INNER SPACE BASED ON ABSOLUTE BLISS. The highest greatest and best wealth you need to have is ability to unclutch®.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/PhkWeoi4Cdg/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/PhkWeoi4Cdg/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/PhkWeoi4Cdg/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/PhkWeoi4Cdg/720p/playlist.m3u8',
      duration: '00:34:04',
      views: 10403,
      likes: 384,
      date: '20 Sep 2019',
      category: 'Be Unclutched'
    },
    {
      id: 'Zup2iKTBPaA',
      title: 'Become a Wealth Magnet || Part 5 || eN Wealth',
      description: 'The Supreme Pontiff of Hinduism Jagatguru Mahasannidhanam HDH Bhagavan Nithyananda Paramashivam is giving all the delegates insights into the sacred secrets from the Vedic civilisation on wealth.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/Zup2iKTBPaA/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/Zup2iKTBPaA/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/Zup2iKTBPaA/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/Zup2iKTBPaA/720p/playlist.m3u8',
      duration: '00:20:06',
      views: 0,
      likes: 23,
      date: '10 Apr 2011',
      category: 'eN Wealth'
    },
    {
      id: 'YL1xzoSaFhY',
      title: 'Fundamental Principle to Awaken Wealth Consciousness',
      description: 'What are the fundamental principles to awaken wealth consciousness? Explained by Paramahamsa Nithyananda on 05 Nov 2017 in Dhanakarshana Bhairava Homa.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/YL1xzoSaFhY/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/YL1xzoSaFhY/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/YL1xzoSaFhY/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/YL1xzoSaFhY/720p/playlist.m3u8',
      duration: '00:01:28',
      views: 20283,
      likes: 295,
      date: '05 Nov 2017',
      category: 'eN Wealth'
    },
    {
      id: '0iMvHH9JJd8',
      title: 'Introduction to Nithya kriya by Nithyananda',
      description: 'Introduction to Nithya Kriya - ancient yogic practices for health and wellbeing.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/0iMvHH9JJd8/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/0iMvHH9JJd8/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/0iMvHH9JJd8/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/0iMvHH9JJd8/720p/playlist.m3u8',
      duration: '00:15:39',
      views: 1620,
      likes: 20,
      date: '14 Sep 2020',
      category: 'Nithya Kriya: Care & Cure'
    },
    {
      id: '47_0RLvOOGs',
      title: 'Nithya kriya For Curing Heart Disease',
      description: 'Specific yogic practices designed to support heart health and cardiovascular wellness.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/47_0RLvOOGs/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/47_0RLvOOGs/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/47_0RLvOOGs/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/47_0RLvOOGs/720p/playlist.m3u8',
      duration: '00:34:49',
      views: 2323,
      likes: 50,
      date: '04 Nov 2011',
      category: 'Nithya Kriya: Care & Cure'
    },
    {
      id: '2Mivy4A-Xmc',
      title: 'Yoga Webinar and Kriya for Inner Peace',
      description: 'A Special Webinar on the 1st International Yoga Day by Paramahamsa Nithyananda. Includes Kriya for Inner Peace. What is yoga, and what is the purpose of yoga? And how do you know if the yoga you are practicing comes from an authentic source?',
      thumbnail: 'https://ntv-cms.nithyananda.ai/2Mivy4A-Xmc/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/2Mivy4A-Xmc/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/2Mivy4A-Xmc/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/2Mivy4A-Xmc/720p/playlist.m3u8',
      duration: '01:21:41',
      views: 0,
      likes: 150,
      date: '21 Jun 2015',
      category: 'Webinars'
    },
    {
      id: 'bQVdF_AY2QI',
      title: 'Secrets of Karma Revealed by Paramahamsa Nithyananda',
      description: 'In the special global webinar on \'Secrets of Karma\', His Holiness Paramahamsa Nithyananda revealed the unknown, ultimate sacred secrets of karma – the myths and truths of \'karma, action\', good, bad and beyond, that have always been binding and puzzling the human minds.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/bQVdF_AY2QI/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/bQVdF_AY2QI/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/bQVdF_AY2QI/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/bQVdF_AY2QI/720p/playlist.m3u8',
      duration: '01:31:32',
      views: 0,
      likes: 1553,
      date: '02 Aug 2015',
      category: 'Webinars'
    },
    {
      id: 'GI_SN7AHFwo',
      title: 'Secrets of the Third Eye Webinar',
      description: 'Nithyananda Shares the sacred secrets of the third eye, one of the most debated and discussed topics in spirituality. This video also contains a powerful guided meditation to open the third eye and a demonstration of the powers that start expressing through us when our third eye is opened.',
      thumbnail: 'https://ntv-cms.nithyananda.ai/GI_SN7AHFwo/thumbnail.webp',
      masterUrl: 'https://ntv-cms.nithyananda.ai/GI_SN7AHFwo/master.m3u8',
      url1080p: 'https://ntv-cms.nithyananda.ai/GI_SN7AHFwo/1080p/playlist.m3u8',
      url720p: 'https://ntv-cms.nithyananda.ai/GI_SN7AHFwo/720p/playlist.m3u8',
      duration: '01:10:20',
      views: 0,
      likes: 6079,
      date: '14 Jan 2025',
      category: 'Webinars'
    }
  ];

  const getFilteredVideos = () => {
    let result = videos;
    
    if (selectedFilter.value !== 'All') {
      result = result.filter(video => video.category === selectedFilter.value);
    }
    
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(video => 
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query)
      );
    }
    
    return result;
  };

  const handleVideoClick = $((video: Video) => {
    selectedVideo.value = video;
    showModal.value = true;
  });

  const closeModal = $(() => {
    showModal.value = false;
    selectedVideo.value = null;
  });

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  return (
    <>
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* Header Section */}
        <div class="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 class="text-4xl md:text-5xl font-bold mb-4">Video Playlists</h1>
            <p class="text-xl text-orange-100 max-w-3xl">
              Explore our curated collection of spiritual teachings, wisdom, and transformative practices
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
                  placeholder="Search videos..."
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={searchQuery.value}
                  onInput$={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
                />
              </div>

              {/* Filter Buttons */}
              <div class="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    class={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedFilter.value === filter
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick$={() => selectedFilter.value = filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      {video.category}
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
                      <span class="flex items-center gap-1">
                        ❤️ {video.likes}
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
              <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
                <div class="aspect-video bg-black rounded-lg mb-6">
                  <video
                    controls
                    class="w-full h-full"
                    poster={selectedVideo.value.thumbnail}
                  >
                    <source src={selectedVideo.value.url1080p} type="application/x-mpegURL" />
                    <source src={selectedVideo.value.url720p} type="application/x-mpegURL" />
                    <source src={selectedVideo.value.masterUrl} type="application/x-mpegURL" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Video Info */}
                <div class="space-y-4">
                  <div>
                    <span class="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full mb-2">
                      {selectedVideo.value.category}
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
                        ❤️ {selectedVideo.value.likes} likes
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
  title: 'Video Playlists - Nithyananda Sangha',
  meta: [
    {
      name: 'description',
      content: 'Explore our curated collection of spiritual teachings, wisdom, and transformative practices from Paramahamsa Nithyananda',
    },
  ],
};
