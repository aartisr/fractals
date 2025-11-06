/**
 * Chat Send API - Sends a message to the chat service
 * POST /api/chat/send
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onPost: RequestHandler = async ({ request, json, env, cookie }) => {
  const chatServiceUrl = env.get('CHAT_SERVICE_URL');
  const token = cookie.get('nandi_session_token')?.value;

  if (!chatServiceUrl) {
    json(500, {
      success: false,
      error: 'Chat service not configured',
    });
    return;
  }

  try {
    const body = await request.json();
    const { streamId, content, type } = body;

    // Validate required fields
    if (!streamId || !content) {
      json(400, {
        success: false,
        error: 'Missing required fields: streamId, content',
      });
      return;
    }

    if (!token) {
      json(401, { success: false, error: 'Unauthorized' });
      return;
    }

    // Forward request to chat service
    const response = await fetch(`${chatServiceUrl}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        streamId,
        content,
        type: type || 'user',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      json(response.status, {
        success: false,
        error: errorData.error || `Chat service returned ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    json(200, data);
  } catch (err) {
    console.error('[Chat API] Error sending message:', err);
    json(500, {
      success: false,
      error: `Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }
};
