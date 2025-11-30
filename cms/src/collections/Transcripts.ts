import type { CollectionConfig } from 'payload'

export const Transcripts: CollectionConfig = {
  slug: 'transcripts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['stream', 'language', 'version'],
    group: 'System',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ req, doc }) => {
        // Notify listeners that a transcript version/state changed.
        try {
          const db: any = req?.payload?.db as any

          // Extract numeric stream ID from relationship field
          const streamId = typeof doc.stream === 'object' ? doc.stream?.id : doc.stream

          if (!streamId) {
            req.payload.logger?.warn?.(
              'transcripts notify skipped: missing stream ID',
            )
            return
          }

          if (!db || typeof db.query !== 'function') {
            req.payload.logger?.warn?.(
              'transcripts notify skipped: db.query not available',
            )
            return
          }

          await db.query(
            `SELECT pg_notify('transcripts_update', json_build_object('stream_id', $1, 'language', $2, 'version', $3, 'is_final', COALESCE($4, false))::text)`,
            [streamId, doc.language, doc.version, doc.isFinal],
          )

          // Log success for debugging
          req.payload.logger?.info?.(
            `transcripts notify sent: stream_id=${streamId}, language=${doc.language}, version=${doc.version}`,
          )
        } catch (err) {
          req.payload.logger?.error?.(
            { err },
            'transcripts notify failed (continuing without pub/sub)',
          )
        }
      },
    ],
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
      name: 'language',
      label: 'Language',
      type: 'text',
      required: true,
      defaultValue: 'en',
    },
    {
      name: 'version',
      label: 'Version',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Monotonically increasing version of this transcript.',
      },
    },
    {
      name: 'isFinal',
      label: 'Finalized',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark when no further live updates will be applied.',
      },
    },
  ],
}
