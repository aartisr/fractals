/**
 * Chat Stream API - Proxy SSE from chat service
 * GET /api/chat/stream?streamId={id}
 *
 * Note: This is a server-side proxy for SSE streaming
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, getWritableStream, env, cookie, error, headers, status }) => {
  const chatServiceUrl = env.get('CHAT_SERVICE_URL');
  const streamId = query.get('streamId');
  const token = cookie.get('nandi_session_token')?.value;

  if (!chatServiceUrl) {
    throw error(500, 'Chat service not configured');
  }

  if (!streamId) {
    throw error(400, 'streamId query parameter is required');
  }

  if (!token) {
    throw error(401, 'Unauthorized');
  }

  try {
    // Forward SSE request to chat service
    const url = `${chatServiceUrl}/chat/stream?streamId=${encodeURIComponent(streamId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      status(response.status);
      headers.set('Content-Type', 'text/plain');
      const writer = getWritableStream().getWriter();
      await writer.write(new TextEncoder().encode(`Upstream error: ${response.status} - ${errText}`));
      await writer.close();
      return;
    }

    if (!response.body) {
      throw new Error('No response body from chat service');
    }

    // Set SSE response headers for the client connection
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no'); // Disable Nginx buffering if present

    // Get writable stream and pipe the response
    const stream = getWritableStream();
    const writer = stream.getWriter();
    const reader = response.body.getReader();
    
    // We don't need to send an initial comment manually if the backend does it, 
    // but it doesn't hurt to ensure the connection is open.
    // However, if we double-write, it might be weird. 
    // The backend now flushes immediately, so let's just pipe.

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } catch (writeErr) {
      // Stream write error - connection likely closed by client
    } finally {
      reader.releaseLock();
      writer.close();
    }
  } catch (err) {
    // If headers haven't been sent, we can try to send an error response
    try {
        status(500);
        headers.set('Content-Type', 'text/plain');
        const writer = getWritableStream().getWriter();
        await writer.write(new TextEncoder().encode(`Internal Error: ${err instanceof Error ? err.message : String(err)}`));
        await writer.close();
    } catch (e) {
        // Ignore if stream is already closed
    }
  }
};
