/**
 * useViewerSession Hook
 *
 * Manages viewer session lifecycle for content analytics (livestreams and videos):
 * - Creates a session when user starts watching
 * - Sends periodic heartbeats to indicate active viewing
 * - Ends the session when user leaves
 * - Shares session ID across browser tabs using localStorage
 * - Supports both livestreams and regular videos via contentType parameter
 */

import { useVisibleTask$, useSignal, $ } from '@builder.io/qwik';

type ContentType = 'livestream' | 'video';

export interface ViewerSessionOptions {
  streamId?: string;
  videoId?: string;
  viewerName?: string;
  enabled?: boolean;
  contentType?: ContentType;
}

export function useViewerSession(options: ViewerSessionOptions) {
  const {
    streamId,
    videoId,
    viewerName = 'Anonymous',
    enabled = true,
    contentType = 'livestream'
  } = options;

  const contentId = streamId || videoId;

  const sessionId = useSignal<string | null>(null);
  const isTracking = useSignal(false);
  const currentQuality = useSignal<string>('auto');
  const isOwner = useSignal(false); // Track if this tab created the session

  // Generate a unique session ID
  const generateSessionId = $(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  });

  // Get or create session ID for this content (shared across tabs)
  const getOrCreateSessionId = $(async (): Promise<string> => {
    const storageKey = `viewer_session_${contentType}_${contentId}`;

    try {
      // Check if there's an existing session in localStorage
      const existingSessionData = localStorage.getItem(storageKey);

      if (existingSessionData) {
        const { sessionId: existingId, timestamp } = JSON.parse(existingSessionData);
        // If session is less than 5 minutes old, reuse it
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log('[ViewerSession] Reusing existing session from another tab:', existingId);
          isOwner.value = false;
          return existingId;
        }
      }
    } catch (err) {
      console.warn('[ViewerSession] Failed to read localStorage:', err);
    }

    // Create new session
    const newId = await generateSessionId();
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        sessionId: newId,
        timestamp: Date.now(),
      }));
      isOwner.value = true;
    } catch (err) {
      console.warn('[ViewerSession] Failed to write localStorage:', err);
    }

    return newId;
  });

  // Start viewer session
  const startSession = $(async (quality?: string) => {
    if (!enabled || !contentId) return;

    try {
      const existingSessionId = await getOrCreateSessionId();

      // If we're reusing a session from another tab, just send heartbeat
      if (!isOwner.value) {
        sessionId.value = existingSessionId;
        isTracking.value = true;
        // Send heartbeat to update the existing session
        await sendHeartbeat(quality);
        return;
      }

      // Create new session in backend
      const response = await fetch('/api/viewers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: existingSessionId,
          streamId,
          videoId,
          viewerName,
          quality: quality || 'auto',
          contentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionId.value = data.sessionId;
        isTracking.value = true;
        if (quality) {
          currentQuality.value = quality;
        }
        console.log('[ViewerSession] Session started:', data.sessionId);
      } else {
        console.error('[ViewerSession] Failed to start session:', await response.text());
      }
    } catch (err) {
      console.error('[ViewerSession] Error starting session:', err);
    }
  });

  // Send heartbeat
  const sendHeartbeat = $(async (quality?: string) => {
    if (!enabled || !sessionId.value) return;

    try {
      const response = await fetch('/api/viewers/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId.value,
          quality: quality || currentQuality.value,
          contentType,
        }),
      });

      if (response.ok) {
        if (quality && quality !== currentQuality.value) {
          currentQuality.value = quality;
        }
      } else {
        console.error('[ViewerSession] Failed to send heartbeat:', await response.text());
      }
    } catch (err) {
      console.error('[ViewerSession] Error sending heartbeat:', err);
    }
  });

  // End viewer session
  const endSession = $(async () => {
    if (!enabled || !sessionId.value) return;

    try {
      const response = await fetch('/api/viewers/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId.value,
          contentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ViewerSession] Session ended. Duration:', data.watchDurationSeconds, 'seconds');
        isTracking.value = false;
        sessionId.value = null;
      } else {
        console.error('[ViewerSession] Failed to end session:', await response.text());
      }
    } catch (err) {
      console.error('[ViewerSession] Error ending session:', err);
    }
  });

  // Update quality when it changes
  const updateQuality = $((quality: string) => {
    currentQuality.value = quality;
    // Heartbeat will be sent on next interval with new quality
  });

  // Set up session lifecycle
  useVisibleTask$(({ cleanup }) => {
    if (!enabled || !contentId) return;

    let heartbeatInterval: NodeJS.Timeout;
    let hasStarted = false;

    // Start session after a brief delay to ensure player is ready
    const startTimeout = setTimeout(async () => {
      await startSession();
      hasStarted = true;

      // Send heartbeat every 30 seconds
      heartbeatInterval = setInterval(async () => {
        await sendHeartbeat();
      }, 30000); // 30 seconds
    }, 1000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tab/minimized - we could optionally pause heartbeats
        // For now, we keep sending heartbeats even when tab is not visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for storage events (when another tab updates the session)
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = `viewer_session_${contentType}_${contentId}`;
      if (e.key === storageKey && !e.newValue) {
        // Session was cleared by another tab
        console.log('[ViewerSession] Session cleared by another tab');
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        isTracking.value = false;
        sessionId.value = null;
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    cleanup(async () => {
      clearTimeout(startTimeout);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);

      // Only end session if this tab created it
      if (hasStarted && sessionId.value && isOwner.value) {
        await endSession();
        // Clear from localStorage
        try {
          localStorage.removeItem(`viewer_session_${contentType}_${contentId}`);
        } catch (err) {
          console.warn('[ViewerSession] Failed to clear localStorage:', err);
        }
      }
    });
  });

  return {
    sessionId,
    isTracking,
    currentQuality,
    updateQuality,
    startSession,
    endSession,
  };
}
