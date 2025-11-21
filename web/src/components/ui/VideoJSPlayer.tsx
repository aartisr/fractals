import {
  component$,
  useSignal,
  useVisibleTask$,
  $,
  useOnWindow,
  noSerialize,
} from "@builder.io/qwik";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "@videojs/http-streaming";

import "video.js/dist/video-js.css";

export interface VideoSource {
  src: string;
  type: string;
  label?: string;
  res?: number;
}

export interface VideoJSPlayerProps {
  sources: VideoSource[];
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  fluid?: boolean;
  aspectRatio?: string;
  playbackRates?: number[];
  onReady?: (player: Player) => void;
  onError?: (error: any) => void;
}

export const VideoJSPlayer = component$<VideoJSPlayerProps>((props) => {
  const videoRef = useSignal<HTMLVideoElement>();
  const playerRef = useSignal<Player>();
  const containerRef = useSignal<HTMLDivElement>();
  const currentQuality = useSignal<number>(0);
  const showQualityMenu = useSignal<boolean>(false);
  const errorMessage = useSignal<string>("");

  // Sort sources by resolution (highest first)
  const sortedSources = props.sources.sort((a, b) => {
    const resA = a.res || 0;
    const resB = b.res || 0;
    return resB - resA;
  });

  const handleQualityChange = $((index: number) => {
    const player = playerRef.value;
    if (!player) return;

    const currentTime = player.currentTime();
    const isPaused = player.paused();

    // Change source
    player.src([{
      src: sortedSources[index].src,
      type: sortedSources[index].type,
    }]);

    // Restore playback state
    player.one("loadedmetadata", () => {
      player.currentTime(currentTime);
      if (!isPaused && typeof player.play === 'function') {
        player.play()?.catch?.(() => {});
      }
    });

    currentQuality.value = index;
    showQualityMenu.value = false;
  });

  const retryPlayback = $(() => {
    const player = playerRef.value;
    if (!player) return;

    errorMessage.value = "";
    player.src([{
      src: sortedSources[currentQuality.value].src,
      type: sortedSources[currentQuality.value].type,
    }]);
    player.load();
    if (typeof player.play === 'function') {
      player.play()?.catch?.(() => {});
    }
  });

  // Initialize player
  useVisibleTask$(({ cleanup, track }) => {
    track(() => props.sources);

    if (!videoRef.value) return;

    const videoElement = videoRef.value;

    // Initialize Video.js with sources in options
    const player = videojs(videoElement, {
      controls: props.controls ?? true,
      autoplay: props.autoplay ?? false,
      preload: "auto",
      muted: props.muted ?? false,
      fluid: props.fluid ?? true,
      aspectRatio: props.aspectRatio ?? "16:9",
      playbackRates: props.playbackRates ?? [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      sources: sortedSources.length > 0 ? [{
        src: sortedSources[0].src,
        type: sortedSources[0].type,
      }] : [],
      html5: {
        vhs: {
          overrideNative: !videoElement.canPlayType('application/vnd.apple.mpegurl'),
          enableLowInitialPlaylist: true,
          fastQualityChange: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
      controlBar: {
        volumePanel: { inline: false },
        children: [
          "playToggle",
          "progressControl",
          "currentTimeDisplay",
          "timeDivider",
          "durationDisplay",
          "volumePanel",
          "captionsButton",
          "playbackRateMenuButton",
          "pictureInPictureToggle",
          "fullscreenToggle",
        ],
      },
    });

    player.ready(() => {
      console.log("Video.js player ready");

      // Check if VHS is available
      try {
        const tech = player.tech({ IWillNotUseThisInPlugins: true });
        console.log("VHS available:", !!(tech && (tech as any).vhs));
      } catch (e) {
        console.log("Could not check VHS availability");
      }

      // Add mouse time display (controlBar is not typed in Player, so use type assertion)
      const controlBar = (player as any).controlBar;
      if (
        controlBar &&
        controlBar.progressControl &&
        typeof controlBar.progressControl.addChild === 'function'
      ) {
        try {
          controlBar.progressControl.addChild("MouseTimeDisplay");
        } catch (_) {}
      }

      // Set poster if provided
      if (props.poster) {
        player.poster(props.poster);
      }

      // Call onReady callback
      if (props.onReady) {
        props.onReady(player);
      }
    });

    // Error handling
    player.on("error", () => {
      const err = player.error();
      let message = "Unknown playback error occurred.";

      if (err) {
        const code = err.code;
        const msg = err.message || "Playback failed";
        message = `Error ${code}: ${msg}`;

        // Provide helpful error messages
        if (code === 4) {
          message += "\n\nPossible causes:\n• HLS streaming not supported (requires Video.js HTTP Streaming)\n• CORS issues with the video source\n• Invalid or unreachable video URL";
        }
      }

      console.error("Video.js error:", err);
      errorMessage.value = message;

      if (props.onError) {
        props.onError(err);
      }
    });

  playerRef.value = noSerialize(player);

    cleanup(() => {
      if (player && !player.isDisposed()) {
        player.dispose();
      }
    });
  });

  // Close quality menu when clicking outside
  useOnWindow(
    "click",
    $((event) => {
      const target = event.target as HTMLElement;
      const container = containerRef.value;

      if (container && !container.contains(target)) {
        showQualityMenu.value = false;
      }
    })
  );

  return (
    <div class="video-js-player-wrapper" ref={containerRef}>
      <style dangerouslySetInnerHTML={`
          .video-js-player-wrapper {
            position: relative;
            width: 100%;
          }

          /* Custom Video.js styling */
          .video-js.vjs-custom-theme {
            border-radius: 18px;
            overflow: hidden;
            background-color: #000;
            box-shadow: 0 8px 24px rgba(0,0,0,.35);
          }

          .vjs-custom-theme .vjs-big-play-button {
            border-radius: 999px;
            width: 80px;
            height: 80px;
            background: rgba(19,26,42,.55);
            backdrop-filter: blur(6px);
            border: none;
            transition: transform .15s ease;
          }

          .vjs-custom-theme .vjs-big-play-button:hover {
            transform: scale(1.06);
          }

          .vjs-custom-theme .vjs-control-bar {
            background: linear-gradient(180deg, rgba(9,13,22,0) 0%, rgba(9,13,22,.75) 35%, rgba(9,13,22,.85) 100%);
            height: 48px;
          }

          .vjs-custom-theme .vjs-progress-holder .vjs-play-progress,
          .vjs-custom-theme .vjs-slider-bar {
            background: linear-gradient(90deg, #e7c559, #ffd88a);
          }

          .vjs-custom-theme .vjs-load-progress {
            background: rgba(255,255,255,.15);
          }

          .vjs-custom-theme .vjs-volume-level {
            background: linear-gradient(90deg, #e7c559, #ffd88a);
          }

          /* Quality selector overlay */
          .quality-selector-container {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 100;
          }

          .quality-button {
            background: rgba(19,26,42,.75);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 8px;
            padding: 8px 16px;
            color: #eef2ff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all .15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .quality-button:hover {
            background: rgba(19,26,42,.85);
            border-color: rgba(255,255,255,.2);
            transform: translateY(-1px);
          }

          .quality-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background: rgba(19,26,42,.95);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 10px;
            min-width: 140px;
            box-shadow: 0 8px 24px rgba(0,0,0,.4);
            overflow: hidden;
          }

          .quality-option {
            padding: 10px 16px;
            color: #eef2ff;
            font-size: 13px;
            cursor: pointer;
            transition: all .1s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .quality-option:hover {
            background: rgba(255,255,255,.08);
          }

          .quality-option.active {
            background: linear-gradient(90deg, rgba(231,197,89,.2), rgba(255,216,138,.2));
            color: #ffd88a;
            font-weight: 600;
          }

          .quality-check {
            color: #e7c559;
            font-size: 14px;
          }

          /* Error overlay */
          .error-overlay {
            position: absolute;
            inset: 0;
            background: rgba(8,12,22,.85);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            z-index: 200;
            border-radius: 18px;
          }

          .error-card {
            max-width: 500px;
            background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 14px;
            padding: 20px;
            box-shadow: 0 8px 18px rgba(0,0,0,.35);
          }

          .error-card h3 {
            margin: 0 0 12px 0;
            color: #eef2ff;
            font-size: 18px;
          }

          .error-message {
            color: #9aa3b2;
            font-size: 14px;
            margin-bottom: 16px;
            line-height: 1.5;
            white-space: pre-line;
          }

          .error-actions {
            display: flex;
            gap: 10px;
          }

          .error-btn {
            cursor: pointer;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,.16);
            background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
            color: #eef2ff;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            transition: all .15s ease;
          }

          .error-btn:hover {
            background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.08));
            transform: translateY(-1px);
          }
      `} />

      <div style={{ position: "relative" }}>
        {/* Video Element */}
        <video
          ref={videoRef}
          class="video-js vjs-custom-theme vjs-default-skin"
          crossOrigin="anonymous"
          playsInline
        />

        {/* Quality Selector */}
        {sortedSources.length > 1 && (
          <div class="quality-selector-container">
            <button
              class="quality-button"
              onClick$={() => (showQualityMenu.value = !showQualityMenu.value)}
              aria-label="Select quality"
            >
              <span>
                {sortedSources[currentQuality.value].label ||
                  `${sortedSources[currentQuality.value].res}p`}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showQualityMenu.value
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              >
                <path
                  d="M2 4L6 8L10 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            {showQualityMenu.value && (
              <div class="quality-menu">
                {sortedSources.map((source, index) => (
                  <div
                    key={index}
                    class={`quality-option ${currentQuality.value === index ? "active" : ""}`}
                    onClick$={() => handleQualityChange(index)}
                  >
                    <span>{source.label || `${source.res}p`}</span>
                    {currentQuality.value === index && (
                      <span class="quality-check">✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Overlay */}
        {errorMessage.value && (
          <div class="error-overlay" role="alert" aria-live="assertive">
            <div class="error-card">
              <h3>⚠️ Playback Error</h3>
              <div class="error-message">{errorMessage.value}</div>
              <div class="error-actions">
                <button class="error-btn" onClick$={retryPlayback}>
                  Retry
                </button>
                <button
                  class="error-btn"
                  onClick$={() => (errorMessage.value = "")}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
