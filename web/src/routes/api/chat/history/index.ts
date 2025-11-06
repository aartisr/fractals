/**
 * Chat History API - Gets recent messages for a stream
 * GET /api/chat/history?streamId={id}&limit={50}
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { payload } from '~/utils/payload-sdk';

export const onGet: RequestHandler = async ({ query, json }) => {
  const streamId = query.get('streamId');
  const limit = parseInt(query.get('limit') || '50', 10);

  if (!streamId) {
    json(400, {
      success: false,
      error: 'streamId query parameter is required',
    });
    return;
  }

  try {
    // Get recent messages from database via Payload CMS
    const result = await payload.find({
      collection: 'live-chat',
      where: {
        stream: {
          equals: streamId,
        },
        deletedAt: {
          equals: null,
        },
      },
      sort: '-createdAt',
      limit: Math.min(limit, 100), // Cap at 100 messages
      depth: 2,
    });

    // Map to frontend message shape with author
    const messages = (result.docs || []).map((doc: any) => {
      const ec = doc.ecitizen || {};
      const first = ec.firstName || '';
      const last = ec.lastName || '';
      const full = `${first} ${last}`.trim() || (ec.email ? String(ec.email).split('@')[0] : '');
      return {
        author: {
          id: typeof ec.id === 'number' ? ec.id : Number(ec.id) || 0,
          email: ec.email || '',
          firstName: first,
          lastName: last,
          displayName: full,
        },
        streamId: String(doc.stream),
        content: doc.content,
        type: doc.type,
        timestamp: doc.createdAt,
      };
    });

    json(200, {
      success: true,
      messages,
      total: result.totalDocs || 0,
    });
  } catch (err) {
    console.error('[Chat History API] Error:', err);
    json(500, {
      success: false,
      error: `Failed to fetch chat history: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }
};
