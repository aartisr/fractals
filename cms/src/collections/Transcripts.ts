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

