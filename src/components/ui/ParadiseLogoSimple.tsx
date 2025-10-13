import { component$ } from '@builder.io/qwik';

interface ParadiseLogoSimpleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const ParadiseLogoSimple = component$<ParadiseLogoSimpleProps>(({ size = 'md', variant = 'light' }) => {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const textColor = variant === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <div class={`font-bold ${sizes[size]} ${textColor} flex items-center gap-2`}>
      <svg 
        class="w-8 h-8" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="45" class="fill-green-500" />
        <circle cx="50" cy="50" r="35" class="fill-yellow-500" />
        <circle cx="50" cy="50" r="25" class="fill-red-500" />
        <path 
          d="M50 20 L60 40 L80 40 L65 55 L70 75 L50 60 L30 75 L35 55 L20 40 L40 40 Z" 
          class={variant === 'light' ? 'fill-white' : 'fill-slate-900'}
        />
      </svg>
      <span class="bg-gradient-to-r from-green-600 via-yellow-600 to-red-600 bg-clip-text text-transparent">
        Paradise Reserve Group
      </span>
    </div>
  );
});
