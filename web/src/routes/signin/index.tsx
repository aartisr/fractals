import { component$ } from '@builder.io/qwik';
import { DocumentHead, Link, useLocation } from '@builder.io/qwik-city';
import { LuMail, LuLock, LuArrowLeft, LuLogIn } from '@qwikest/icons/lucide';
import { useUserContext } from '~/routes/plugin@auth';
import { buildLoginUrl } from '~/utils/auth-service';

export default component$(() => {
  const userContext = useUserContext();
  const location = useLocation();
  const loginHref = buildLoginUrl(`${location.url.pathname}${location.url.search}`);

  // Si ya está autenticado, mostrar mensaje
  if (userContext.value.isAuthenticated) {
    return (
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100">
        <div class="max-w-md w-full space-y-8 relative text-center">
          <div class="inline-flex w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div class="absolute inset-0 bg-orange-500 blur-2xl opacity-30 rounded-full"></div>
            <span class="text-white text-3xl font-serif relative z-10">ॐ</span>
          </div>
          <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-2">
            Welcome, {userContext.value.user?.first_name || userContext.value.user?.email}!
          </h2>
          <p class="text-gray-600 mb-8">
            You are already signed in to your divine account
          </p>
          <div class="flex flex-col gap-3">
            <Link href="/dashboard" 
              class="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Go to Dashboard
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

  return (
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100">
      <div 
        class="absolute inset-0 pointer-events-none"
        style="background-image: radial-gradient(circle at center, rgba(251, 146, 60, 0.06) 0%, transparent 70%);"
      ></div>
      
      <div class="max-w-md w-full space-y-8 relative">
        {/* Sacred Symbol */}
        <div class="text-center">
          <div class="inline-flex w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div class="absolute inset-0 bg-orange-500 blur-2xl opacity-30 rounded-full"></div>
            <span class="text-white text-3xl font-serif relative z-10">ॐ</span>
          </div>
          <h2 class="text-4xl font-serif font-semibold tracking-tight text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p class="text-gray-600">
            Continue your journey to divine consciousness
          </p>
        </div>

        {/* Sign In Options */}
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-orange-200/50 p-8">
          
          {/* Email/Password Sign In */}
          <div class="space-y-4">
            <a
              href={loginHref}
              class="w-full flex justify-center items-center gap-3 py-4 px-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <LuMail class="w-5 h-5" />
              <span class="font-serif">Sign In with Email</span>
            </a>
            
            <p class="text-center text-sm text-gray-500">
              Sign in with your sacred credentials through our secure authentication service
            </p>
          </div>

          {/* Divider */}
          <div class="my-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-orange-200"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500 font-serif">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Social Sign In */}
          <div class="space-y-3">
            <a
              href={loginHref}
              class="w-full inline-flex justify-center items-center gap-3 py-4 px-4 border-2 border-orange-200 rounded-xl bg-white hover:bg-orange-50 hover:border-orange-400 transition-all duration-300"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1818182,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
              </svg>
              <span class="text-sm font-medium text-gray-700">Continue with Google</span>
            </a>

            <p class="text-center text-xs text-gray-400 px-4">
              Secure authentication powered by auth.kailasa.ai
            </p>
          </div>

          {/* Sign Up Link */}
          <p class="mt-6 text-center text-sm text-gray-600">
            New to divine wisdom?{' '}
            <a href={loginHref} class="font-medium text-orange-600 hover:text-orange-700 transition-colors font-serif">
              Create sacred account
            </a>
          </p>
        </div>

        {/* Back to Home */}
        <div class="text-center">
          <Link href="/" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors">
            <LuArrowLeft class="w-4 h-4" />
            <span>Back to sacred home</span>
          </Link>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Sign In - Nithyananda TV',
  meta: [
    {
      name: 'description',
      content: 'Sign in to access your spiritual journey and sacred teachings.',
    },
  ],
};
