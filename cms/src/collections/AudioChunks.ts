import type { CollectionConfig } from 'payload'

export const AudioChunks: CollectionConfig = {
  slug: 'audio-chunks',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['stream', 'startMs', 'endMs'],
    group: 'System',
  },
  access: {
    read: ({ req }) => Boolean(req?.user),
    create: ({ req }) => Boolean(req?.user),
    update: () => false,
    delete: ({ req }) => Boolean(req?.user),
  },
  fields: [
    {
      name: 'stream',
      label: 'Live Stream',
      type: 'relationship',
      relationTo: 'live-streams',
      required: true,
    },
    {
      name: 'startMs',
      label: 'Start (ms)',
      type: 'number',
      required: true,
    },
    {
      name: 'endMs',
      label: 'End (ms)',
      type: 'number',
      required: true,
    },
    {
      name: 'filePath',
      label: 'File Path',
      type: 'text',
      required: true,
      admin: {
        description: 'Path or URL to the analysis chunk audio file.',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ req, doc }) => {
        // Emit NOTIFY so the transcription worker can react in pub/sub mode.
        // Safe no-op if db/pg_notify isn't available.
        try {
          const db: any = req?.payload?.db as any

          // Extract numeric stream ID from relationship field
          // In Payload, relationship fields can be objects or IDs
          const streamId = typeof doc.stream === 'object' ? doc.stream?.id : doc.stream

          if (!streamId) {
            req.payload.logger?.warn?.(
              'audio_chunks notify skipped: missing stream ID',
            )
            return
          }

          if (!db || typeof db.query !== 'function') {
            req.payload.logger?.warn?.(
              'audio_chunks notify skipped: db.query not available',
            )
            return
          }

          await db.query(
            `SELECT pg_notify('audio_chunks', json_build_object('id', $1, 'stream_id', $2)::text)`,
            [doc.id, streamId],
          )

          // Log success for debugging
          req.payload.logger?.info?.(
            `audio_chunks notify sent: id=${doc.id}, stream_id=${streamId}`,
          )
        } catch (err) {
          req.payload.logger?.error?.(
            { err },
            'audio_chunks notify failed (continuing without pub/sub)',
          )
        }
      },
    ],
  },
}
