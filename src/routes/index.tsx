import { component$ } from '@builder.io/qwik';
import { DocumentHead, Link } from '@builder.io/qwik-city';
import { 
  LuPlay,
  LuCalendar,
  LuUsers,
  LuClock,
  LuSparkles,
  LuMessageCircle,
  LuCompass,
  LuArrowRight,
  LuUser,
  LuHeart,
  LuActivity,
  LuBookOpen
} from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();
  
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

              <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-full mb-8 shadow-sm">
                <span class="w-2 h-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full animate-pulse"></span>
                <span class="font-serif tracking-wide">LIVE DARSHAN NOW</span>
              </div>
              
              <h1 class="text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold tracking-tight text-transparent bg-gradient-to-br from-orange-800 via-orange-600 to-amber-600 bg-clip-text mb-6 leading-tight">
                Experience Divine Consciousness
              </h1>
              
              <p class="text-lg text-gray-700 mb-8 leading-relaxed font-light">
                Immerse yourself in the sacred teachings of His Holiness Paramahamsa Nithyananda. Access thousands of enlightening discourses, live darshans, and transformative spiritual practices.
              </p>
              
              <div class="flex flex-wrap items-center gap-4">
                <Link 
                  href={userContext.value.isAuthenticated ? "/playlists" : "/signin"}
                  class="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  style="animation: pulse-glow 3s ease-in-out infinite;"
                >
                  <LuPlay class="w-5 h-5" />
                  Begin Your Journey
                </Link>
                <Link 
                  href="/playlists"
                  class="px-8 py-4 border-2 border-orange-300 bg-white/50 backdrop-blur-sm text-orange-800 font-medium rounded-xl hover:bg-white hover:border-orange-400 hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <LuCalendar class="w-5 h-5" />
                  Sacred Schedule
                </Link>
              </div>
              
              <div class="mt-12 flex items-center gap-8 text-sm">
                <div class="flex items-center gap-2">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center border border-orange-200">
                    <span class="text-orange-700 font-semibold font-serif">2.4K</span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">Live Viewers</div>
                    <div class="text-xs text-gray-500">Watching now</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center border border-orange-200">
                    <span class="text-orange-700 font-semibold font-serif">10K+</span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">Sacred Videos</div>
                    <div class="text-xs text-gray-500">Available</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 blur-3xl opacity-20 rounded-3xl"></div>
              <div class="relative aspect-[4/5] bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
                <img 
                  src="https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80" 
                  alt="Meditation" 
                  class="w-full h-full object-cover"
                  width={800}
                  height={1000}
                />
                <div class="absolute inset-0 bg-gradient-to-t from-orange-900/60 via-transparent to-transparent"></div>
                <button 
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300"
                  style="animation: pulse-glow 3s ease-in-out infinite;"
                >
                  <LuPlay class="w-9 h-9 text-orange-600 ml-1" />
                </button>
                <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm">
                  <div class="flex items-center gap-3 text-white">
                    <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                      <span class="text-lg font-serif">ॐ</span>
                    </div>
                    <div>
                      <div class="font-serif font-medium">Morning Darshan</div>
                      <div class="text-xs text-white/80">Day 342 • Live Now</div>
                    </div>
                  </div>
                </div>
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
              <span class="font-serif tracking-wide">SACRED LIVE STREAMS</span>
            </div>
            <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-3">SPH LIVE Darshan</h2>
            <p class="text-gray-600 max-w-2xl mx-auto">Connect with divine consciousness through live spiritual sessions</p>
          </div>
          
          <div class="grid md:grid-cols-3 gap-6">
            {[
              { 
                image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
                status: 'LIVE NOW',
                statusColor: 'from-red-600 to-red-500',
                viewers: '2,487',
                title: 'Morning Darshan - Day 342',
                time: 'Started 1h 23m ago',
                action: 'Watch Now'
              },
              {
                image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80',
                status: 'UPCOMING',
                statusColor: 'from-orange-600 to-amber-600',
                title: 'Evening Satsang',
                time: 'Today at 6:00 PM EST',
                action: 'Set Reminder'
              },
              {
                image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&q=80',
                status: 'SCHEDULED',
                statusColor: 'from-gray-800 to-gray-700',
                title: 'Special Discourse Series',
                time: 'Tomorrow at 8:00 AM',
                action: 'Set Reminder'
              }
            ].map((session, idx) => (
              <div key={idx} class="bg-white rounded-2xl overflow-hidden border-2 border-orange-200/50 hover:border-orange-400 hover:shadow-2xl transition-all duration-300 group cursor-pointer">
                <div class="aspect-video bg-gradient-to-br from-orange-100 to-amber-50 relative">
                  <img 
                    src={session.image} 
                    alt="Live Session" 
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    width={600}
                    height={338}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div class={`absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r ${session.statusColor} text-white text-xs font-medium rounded-lg ${session.status === 'LIVE NOW' ? 'flex items-center gap-2' : ''} shadow-lg font-serif`}>
                    {session.status === 'LIVE NOW' && <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                    {session.status}
                  </div>
                  {session.viewers && (
                    <div class="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
                      <LuUsers class="w-3 h-3" />
                      {session.viewers}
                    </div>
                  )}
                  <div class="absolute bottom-4 left-4 right-4">
                    <div class="flex items-center gap-2 text-white">
                      <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                        <span class="text-sm font-serif">ॐ</span>
                      </div>
                      <div class="flex-1">
                        <div class="text-xs text-white/80 font-serif">SPH Nithyananda</div>
                        <div class="text-sm font-medium">{session.title}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-6">
                  <div class="flex items-center justify-between text-sm text-gray-600">
                    <span class="flex items-center gap-1.5">
                      {session.status === 'LIVE NOW' ? <LuClock class="w-4 h-4" /> : <LuCalendar class="w-4 h-4" />}
                      {session.time}
                    </span>
                    <button class="text-orange-600 hover:text-orange-700 font-medium">{session.action}</button>
                  </div>
                </div>
              </div>
            ))}
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
              <span class="font-serif tracking-wide">CURATED COLLECTIONS</span>
            </div>
            <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-3">Sacred Playlists</h2>
            <p class="text-gray-600 max-w-2xl mx-auto">Journey through curated paths of spiritual awakening</p>
          </div>
          
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { image: 'https://images.unsplash.com/photo-1602192509154-0b900ee1f851?w=400&q=80', count: 24, title: 'Meditation Mastery', desc: 'Complete guide to meditation practices', href: '/playlists' },
              { image: 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=400&q=80', count: 18, title: 'Yoga & Wellness', desc: 'Ancient practices for modern life', href: '/playlists' },
              { image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', count: 32, title: 'Spiritual Wisdom', desc: 'Timeless teachings and insights', href: '/playlists' },
              { image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80', count: 15, title: 'Sacred Scriptures', desc: 'Deep dives into ancient texts', href: '/playlists' }
            ].map((playlist, idx) => (
              <Link key={idx} href={playlist.href} class="group cursor-pointer">
                <div class="aspect-square bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-2xl overflow-hidden mb-4 relative border-2 border-orange-200/50 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <img 
                    src={playlist.image} 
                    alt={playlist.title} 
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    width={400}
                    height={400}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-orange-900/80 via-orange-900/20 to-transparent"></div>
                  <div class="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <span class="text-sm font-semibold text-orange-700">{playlist.count}</span>
                  </div>
                  <div class="absolute bottom-4 left-4 right-4">
                    <div class="flex items-center gap-2 text-white mb-2">
                      <div class="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/50">
                        <LuPlay class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-serif">Video Series</span>
                    </div>
                  </div>
                </div>
                <h3 class="font-serif font-medium text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{playlist.title}</h3>
                <p class="text-sm text-gray-600">{playlist.desc}</p>
              </Link>
            ))}
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
          <h2 class="text-4xl lg:text-5xl font-serif font-semibold tracking-tight text-white mb-6">Ask Nithyananda</h2>
          <p class="text-lg text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Dive deeper into spiritual wisdom with our divine AI assistant. Get instant insights and guidance about the teachings you're exploring.
          </p>
          <Link 
            href="/ask"
            class="px-8 py-4 bg-white text-orange-700 font-medium rounded-xl hover:bg-orange-50 hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
          >
            <LuSparkles class="w-5 h-5" />
            <span class="font-serif">Begin Sacred Dialogue</span>
          </Link>
          <div class="mt-12 flex items-center justify-center gap-12 text-white/90">
            <div>
              <div class="text-3xl font-serif font-semibold">10K+</div>
              <div class="text-sm text-white/70">Questions Answered</div>
            </div>
            <div class="w-px h-12 bg-white/30"></div>
            <div>
              <div class="text-3xl font-serif font-semibold">24/7</div>
              <div class="text-sm text-white/70">Always Available</div>
            </div>
            <div class="w-px h-12 bg-white/30"></div>
            <div>
              <div class="text-3xl font-serif font-semibold">∞</div>
              <div class="text-sm text-white/70">Divine Wisdom</div>
            </div>
          </div>
        </div>
      </div>

      {/* Explore Categories */}
      <div class="py-16 lg:py-20 bg-gradient-to-br from-white to-amber-50/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-full mb-4">
              <LuCompass class="w-3 h-3" />
              <span class="font-serif tracking-wide">SACRED PATHS</span>
            </div>
            <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-3">Explore & Discover</h2>
            <p class="text-gray-600 max-w-2xl mx-auto">Find teachings that resonate with your spiritual journey</p>
          </div>
          
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: 'user', color: 'orange', title: 'Sacred Discourses', count: '432 enlightening videos', IconComponent: LuUser, href: '/playlists' },
              { icon: 'heart', color: 'blue', title: 'Meditation Arts', count: '187 transformative practices', IconComponent: LuHeart, href: '/models' },
              { icon: 'activity', color: 'purple', title: 'Yogic Sciences', count: '256 ancient techniques', IconComponent: LuActivity, href: '/models' },
              { icon: 'book-open', color: 'green', title: 'Sacred Scriptures', count: '143 divine texts explained', IconComponent: LuBookOpen, href: '/playlists' },
              { icon: 'sparkles', color: 'amber', title: 'Divine Healing', count: '98 healing transmissions', IconComponent: LuSparkles, href: '/models' },
              { icon: 'calendar', color: 'rose', title: 'Sacred Events', count: '76 divine celebrations', IconComponent: LuCalendar, href: '/playlists' }
            ].map((category, idx) => (
              <Link key={idx} href={category.href} class={`bg-gradient-to-br from-${category.color}-50 to-${category.color}-100 rounded-2xl p-8 border-2 border-${category.color}-200/50 hover:border-${category.color}-400 hover:shadow-xl transition-all duration-300 cursor-pointer group`}>
                <div class={`w-14 h-14 bg-gradient-to-br from-${category.color}-600 to-${category.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  <category.IconComponent class="w-7 h-7 text-white" />
                </div>
                <h3 class="text-xl font-serif font-medium text-gray-900 mb-2">{category.title}</h3>
                <p class="text-sm text-gray-600 mb-4">{category.count}</p>
                <div class={`flex items-center gap-2 text-${category.color}-600 text-sm font-medium`}>
                  <span class="font-serif">Explore Path</span>
                  <LuArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Nithyananda TV - Divine Streaming Platform',
  meta: [
    {
      name: 'description',
      content: 'Experience divine consciousness through sacred teachings of His Holiness Paramahamsa Nithyananda. Access thousands of enlightening discourses, live darshans, and transformative spiritual practices.',
    },
    {
      property: 'og:title',
      content: 'Nithyananda TV - Divine Streaming Platform',
    },
    {
      property: 'og:description',
      content: 'Immerse yourself in the sacred teachings. Access thousands of enlightening discourses, live darshans, and transformative spiritual practices.',
    },
  ],
};
