import type { CollectionConfig } from 'payload'

export const Transcripts: CollectionConfig = {
  slug: 'transcripts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['stream', 'language', 'version'],
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
          await db?.query?.(
            `SELECT pg_notify('transcripts_update', json_build_object('stream_id', $1, 'language', $2, 'version', $3, 'is_final', COALESCE($4, false))::text)`,
            [doc.stream, doc.language, doc.version, doc.isFinal],
          )
        } catch (err) {
          req.payload.logger?.warn?.(
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
