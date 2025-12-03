import { component$, Slot, useVisibleTask$, useSignal, $ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import {
  LuMenu,
  LuSearch,
  LuBell,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuVideo,
  LuPlayCircle,
  LuListVideo,
  LuLogIn,
  LuLogOut,
  LuUser,
  LuTwitter,
  LuFacebook,
  LuInstagram,
  LuYoutube,
  LuCreditCard,
  LuStar
} from '@qwikest/icons/lucide';
import { useUserContext } from './plugin@auth';

export default component$(() => {
  const loc = useLocation();
  const sidebarOpen = useSignal(true); // Abierto por defecto
  const userContext = useUserContext(); // Auth context from plugin

  // Handler para cerrar sidebar en mobile al hacer click en un link
  const closeSidebarOnMobile = $(() => {
    if (window.innerWidth <= 1024) {
      sidebarOpen.value = false;
    }
  });

  // Cerrar sidebar en mobile al cargar
  useVisibleTask$(() => {
    if (window.innerWidth <= 1024) {
      sidebarOpen.value = false;
    }
  });

  return (
    <>
      {/* Mobile Top Navbar */}
      <nav class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-orange-200/50 z-50 shadow-sm">
        <div class="flex items-center justify-between h-full px-4">
          <button
            onClick$={$(() => {
              sidebarOpen.value = !sidebarOpen.value;
            })}
            class="p-2 hover:bg-orange-50 rounded-xl transition-colors"
          >
            <LuMenu class="w-6 h-6 text-gray-700" />
          </button>
          
          <a href="/" class="flex items-center gap-2">
            <img src="/images/sliderlogo.png" alt="Nithyananda TV" class="w-10 h-10 object-contain" />
            <div class="text-lg font-serif font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Nithyananda TV
            </div>
          </a>

          <div class="flex items-center gap-2">
            <button class="p-2 hover:bg-orange-50 rounded-xl transition-colors">
              <LuSearch class="w-5 h-5 text-gray-600" />
            </button>
            <button class="p-2 hover:bg-orange-50 rounded-xl transition-colors relative">
              <LuBell class="w-5 h-5 text-gray-600" />
              <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay para cerrar sidebar en mobile */}
      {sidebarOpen.value && (
        <div
          class="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick$={$(() => {
            sidebarOpen.value = false;
          })}
        ></div>
      )}

      {/* Sidebar - Expandido/Mini en desktop, deslizable en mobile */}
      <aside
        class={`fixed left-0 top-0 h-screen bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 border-r border-orange-200/50 backdrop-blur-xl z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out
          ${sidebarOpen.value ? 'w-56 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Botón Toggle en el borde derecho - Solo desktop */}
        <button
          onClick$={$(() => {
            sidebarOpen.value = !sidebarOpen.value;
          })}
          class="hidden lg:flex absolute -right-10 top-16 w-8 h-12 bg-gradient-to-r from-orange-500 to-amber-600 text-white items-center justify-center rounded-r-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-300 group"
        >
          {sidebarOpen.value ? (
            <LuChevronLeft class="w-4 h-4 group-hover:scale-110 transition-transform" />
          ) : (
            <LuChevronRight class="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* Logo Section */}
        <div class="p-3 border-b border-orange-200/50 flex items-center justify-center">
          <a href="/" class="flex items-center gap-2 group">
            <div class="relative flex-shrink-0">
              <img src="/images/sliderlogo.png" alt="Nithyananda TV" class="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300" />
            </div>
            {sidebarOpen.value && (
              <div class="flex-1 overflow-hidden">
                <div class="text-base font-bold tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent whitespace-nowrap">
                  Nithyananda TV
                </div>
                <div class="text-[9px] text-orange-600/70 tracking-wider uppercase font-medium leading-tight">
                  Entertaining, Entraining, Enlightening!
                </div>
              </div>
            )}
          </a>
          
          {/* Botón de cerrar solo en mobile cuando está abierto */}
          {sidebarOpen.value && (
            <button
              onClick$={$(() => {
                sidebarOpen.value = false;
              })}
              class="lg:hidden p-2 hover:bg-orange-50 rounded-xl transition-colors flex-shrink-0 ml-auto"
            >
              <LuX class="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Search Bar - Solo cuando está expandido */}
        {sidebarOpen.value && (
          <div class="px-3 py-2">
            <div class="flex items-center gap-2 bg-white/60 border border-orange-200/50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:border-orange-300/60 transition-all duration-300">
              <LuSearch class="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                class="bg-transparent text-xs outline-none w-full placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav class="flex-1 px-2 py-2 overflow-y-auto">
          <div class="space-y-1">
            {/* SPH LIVE */}
            <a
              href="/live"
              onClick$={closeSidebarOnMobile}
              class="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 justify-center lg:justify-start"
              title="SPH LIVE"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform relative flex-shrink-0">
                <LuVideo class="w-4 h-4 text-red-600" />
                <span class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </div>
              {sidebarOpen.value && (
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">SPH LIVE</span>
                  <div class="text-[10px] text-red-500 font-medium">● Live Now</div>
                </div>
              )}
            </a>

            {/* Playlists */}
            <a
              href="/playlists"
              onClick$={closeSidebarOnMobile}
              class="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 justify-center lg:justify-start"
              title="Playlists"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <LuListVideo class="w-4 h-4 text-blue-600" />
              </div>
              {sidebarOpen.value && <span class="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors whitespace-nowrap">Playlists</span>}
            </a>

            {/* All Videos */}
            <a
              href="/videos"
              onClick$={closeSidebarOnMobile}
              class="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 justify-center lg:justify-start"
              title="All Videos"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <LuPlayCircle class="w-4 h-4 text-purple-600" />
              </div>
              {sidebarOpen.value && <span class="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors whitespace-nowrap">All Videos</span>}
            </a>

            {/* Subscriptions */}
            {/* <a
              href="/subscriptions"
              onClick$={closeSidebarOnMobile}
              class="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 justify-center lg:justify-start"
              title="Subscriptions"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <LuStar class="w-4 h-4 text-emerald-600" />
              </div>
              {sidebarOpen.value && <span class="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors whitespace-nowrap">Subscriptions</span>}
            </a> */}

            {/* Account */}
            {/* <a
              href="/account"
              onClick$={closeSidebarOnMobile}
              class="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 justify-center lg:justify-start"
              title="Account"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <LuCreditCard class="w-4 h-4 text-amber-600" />
              </div>
              {sidebarOpen.value && <span class="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors whitespace-nowrap">Account</span>}
            </a> */}
          </div>
        </nav>

        {/* Bottom Section */}
        <div class="p-2 border-t border-orange-200/50 space-y-1.5">
          {/* Auth Section */}
          {userContext.value.isAuthenticated ? (
            <div class="space-y-1.5">
              {/* User Profile Button */}
              <button
                class="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-orange-50/50 hover:shadow-sm transition-all duration-300 relative group justify-center lg:justify-start"
                title={userContext.value.user?.email}
              >
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <LuUser class="w-4 h-4 text-white" />
                </div>
                {sidebarOpen.value && (
                  <div class="flex-1 min-w-0 text-left">
                    <div class="text-xs font-medium text-gray-900 truncate">
                      {userContext.value.user?.first_name} {userContext.value.user?.last_name}
                    </div>
                    <div class="text-[10px] text-gray-500 truncate">
                      {userContext.value.user?.email}
                    </div>
                  </div>
                )}
              </button>

              {/* Sign Out Button */}
              <a
                href="/auth/logout"
                onClick$={closeSidebarOnMobile}
                class="w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-gray-300/50 hover:scale-105 transition-all duration-300"
                title="Sign Out"
              >
                <LuLogOut class="w-4 h-4 flex-shrink-0" />
                {sidebarOpen.value && <span class="whitespace-nowrap">Sign Out</span>}
              </a>
            </div>
          ) : (
            <a
              href={`/auth/login?redirect=${encodeURIComponent(loc.url.pathname)}`}
              onClick$={closeSidebarOnMobile}
              class="w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-orange-300/50 hover:scale-105 transition-all duration-300"
              style="animation: pulse-glow 3s ease-in-out infinite;"
              title="Sign In"
            >
              <LuLogIn class="w-4 h-4 flex-shrink-0" />
              {sidebarOpen.value && <span class="whitespace-nowrap">Sign In</span>}
            </a>
          )}
        </div>
      </aside>
  
      {/* Main Content - Responsive con transición suave */}
      <main
        class={`min-h-screen pt-16 lg:pt-0 transition-all duration-300 ${
          sidebarOpen.value ? 'lg:ml-56' : 'lg:ml-16'
        }`}
      >
        <Slot />
      </main>

      {/* Footer - Responsive con transición suave */}
      <footer
        class={`relative border-t border-orange-200/50 bg-gradient-to-br from-white to-orange-50/30 py-16 transition-all duration-300 ${
          sidebarOpen.value ? 'lg:ml-56' : 'lg:ml-16'
        }`}
      >
        {/* CHAKRA RINGS CSS ILLUSTRATION */}
        <div class="pointer-events-none absolute -z-10 -bottom-24 -right-20 w-[420px] h-[420px] opacity-40">
          <div class="absolute inset-0 rounded-full border border-orange-200" style="box-shadow: 0 0 0 18px rgba(251,146,60,0.08), 0 0 0 42px rgba(251,146,60,0.06), 0 0 0 70px rgba(251,146,60,0.04); background: radial-gradient(circle at 60% 40%, rgba(253,186,116,0.2), rgba(255,255,255,0) 55%);"></div>
          <div class="absolute inset-10 rounded-full border border-amber-200" style="background: radial-gradient(circle at 40% 60%, rgba(251,191,36,0.18), rgba(255,255,255,0) 60%);"></div>
          <div class="absolute inset-20 rounded-full border border-orange-200/70"></div>
          <div class="absolute inset-32 rounded-full border border-orange-300/60"></div>
          <div class="absolute inset-40 rounded-full border border-orange-300/40"></div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div class="flex items-center gap-3 mb-6">
                <div class="relative">
                  <img src="/images/sliderlogo.png" alt="Nithyananda TV" class="w-12 h-12 object-contain" />
                </div>
                <div>
                  <div class="text-xl font-serif font-semibold tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Nithyananda TV</div>
                </div>
              </div>
              <p class="text-sm text-gray-600 mb-6 leading-relaxed">
                Entraining, Entertaining, Enlightening!
              </p>
              <div class="flex items-center gap-2">
                <a href="#" class="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border border-orange-200 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <LuTwitter class="w-4 h-4 text-orange-600" />
                </a>
                <a href="#" class="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border border-orange-200 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <LuFacebook class="w-4 h-4 text-orange-600" />
                </a>
                <a href="#" class="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border border-orange-200 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <LuInstagram class="w-4 h-4 text-orange-600" />
                </a>
                <a href="#" class="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border border-orange-200 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <LuYoutube class="w-4 h-4 text-orange-600" />
                </a>
              </div>
            </div>
            <div>
              <h4 class="font-serif font-medium text-gray-900 mb-4">Sacred Content</h4>
              <ul class="space-y-3 text-sm">
                {['SPH LIVE Darshan', 'Playlists', 'All Videos'].map((item) => (
                  <li key={item}>
                    <a href="#" class="text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-2">
                      <span class="w-1 h-1 bg-orange-400 rounded-full"></span>{item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 class="font-serif font-medium text-gray-900 mb-4">Legal</h4>
              <ul class="space-y-3 text-sm">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Contact Us'].map((item) => (
                  <li key={item}>
                    <a href="#" class="text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-2">
                      <span class="w-1 h-1 bg-orange-400 rounded-full"></span>{item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div class="border-t border-orange-200/50 pt-8">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <p class="text-sm text-gray-600">© {new Date().getFullYear()} Nithyananda TV. All rights reserved.</p>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>Powered by</span>
                <span class="font-serif font-medium text-orange-600">KAILASA's Nithyananda AI</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
});
