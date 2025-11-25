import type { CollectionConfig } from 'payload'

export const AudioChunks: CollectionConfig = {
  slug: 'audio-chunks',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['stream', 'startMs', 'endMs'],
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
          await db?.query?.(
            `SELECT pg_notify('audio_chunks', json_build_object('id', $1, 'stream_id', $2)::text)`,
            [doc.id, doc.stream],
          )
        } catch (err) {
          req.payload.logger?.warn?.(
            { err },
            'audio_chunks notify failed (continuing without pub/sub)',
          )
        }
      },
    ],
  },
}
