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
}

