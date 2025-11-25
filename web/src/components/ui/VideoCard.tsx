import { component$, $ } from '@builder.io/qwik';
import { LuPlay, LuClock, LuEye } from '@qwikest/icons/lucide';

interface VideoCardProps {
  video: {
    id: number;
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    date: string;
    views?: number;
    category?: { id: number; name: string }[] | { id: number; name: string };
  };
  onVideoClick?: (video: any) => void;
  size?: 'small' | 'medium' | 'large';
}

export const VideoCard = component$<VideoCardProps>(({ video, onVideoClick, size = 'medium' }) => {
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
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      if (diffDays < 730) return '1 year ago';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const sizeClasses = {
    small: {
      text: 'text-xs',
      title: 'text-sm',
      icon: 'w-8 h-8',
    },
    medium: {
      text: 'text-xs',
      title: 'text-sm',
      icon: 'w-12 h-12',
    },
    large: {
      text: 'text-sm',
      title: 'text-lg',
      icon: 'w-16 h-16',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick$={() => onVideoClick && onVideoClick(video)}
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
          <LuPlay class={`${classes.icon} text-white`} />
        </div>
        <div class={`absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded ${classes.text}`}>
          {video.duration}
        </div>
      </div>

      {/* Content */}
      <div class="p-4">
        {/* Category badges (if exists) */}
        {video.category && (
          <div class="mb-2">
            {Array.isArray(video.category) ? (
              video.category.slice(0, 2).map((cat) => (
                <span key={cat.id} class={`inline-block px-2 py-1 bg-orange-100 text-orange-700 ${classes.text} font-semibold rounded-full mr-1 mb-1`}>
                  {cat.name}
                </span>
              ))
            ) : (
              <span class={`inline-block px-2 py-1 bg-orange-100 text-orange-700 ${classes.text} font-semibold rounded-full`}>
                {video.category.name}
              </span>
            )}
          </div>
        )}

        <h3 class={`${classes.title} font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors`}>
          {video.title}
        </h3>
        <p class={`text-gray-600 ${classes.text} line-clamp-2 mb-3`}>
          {video.description}
        </p>
        <div class={`flex items-center justify-between ${classes.text} text-gray-500`}>
          <span class="flex items-center gap-1">
            <LuEye class={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />
            {formatViews(video.views)}
          </span>
          <span>{formatDate(video.date)}</span>
        </div>
      </div>
    </div>
  );
});
