import { component$, useSignal, useVisibleTask$, PropFunction } from '@builder.io/qwik';

export interface VideoPlayerProps {
  sources: string[]; // HLS master or quality variant URLs (m3u8)
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  onError$?: PropFunction<(err: string) => void>;
}

/**
 * Reusable HLS video player. Uses dynamic import of hls.js only on browsers that need it.
 * Falls back to the native element if the platform supports HLS natively.
 */
export const VideoPlayer = component$<VideoPlayerProps>((props) => {
  const videoRef = useSignal<HTMLVideoElement>();
  const errorMsg = useSignal<string | null>(null);

  useVisibleTask$(async () => {
    const el = videoRef.value;
    if (!el) return;
    if (!props.sources.length) return;
    const primary = props.sources[0];
    // If browser supports native HLS (Safari iOS/macOS) just set src
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = primary;
      return;
    }
    try {
      const { default: Hls } = await import('hls.js');
      if (Hls.isSupported()) {
        const hls = new Hls({
          autoStartLoad: true,
          enableWorker: true,
        });
        hls.attachMedia(el);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(primary);
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            errorMsg.value = 'Playback error';
            props.onError$?.(data?.details || 'fatal-error');
            hls.destroy();
          }
        });
      } else {
        el.src = primary; // final fallback
      }
    } catch (e) {
      errorMsg.value = 'Failed to load player';
      props.onError$?.(e instanceof Error ? e.message : 'unknown-error');
    }
  });

  return (
    <div class="relative w-full h-full">
      <video
        ref={videoRef}
        class="w-full h-full"
        poster={props.poster}
        playsInline
        controls={props.controls !== false}
        autoplay={props.autoplay}
      >
        {/* Native fallback sources (may work for some browsers) */}
        {props.sources.map((s) => (
          <source src={s} type="application/x-mpegURL" />
        ))}
      </video>
      {errorMsg.value && (
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
          {errorMsg.value}
        </div>
      )}
    </div>
  );
});
