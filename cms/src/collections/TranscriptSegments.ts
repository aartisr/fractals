import type { CollectionConfig } from 'payload'

export const TranscriptSegments: CollectionConfig = {
  slug: 'transcript-segments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['transcript', 'startMs', 'endMs'],
    group: 'System',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'transcript',
      label: 'Transcript',
      type: 'relationship',
      relationTo: 'transcripts',
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
      name: 'text',
      label: 'Text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'rev',
      label: 'Revision',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        readOnly: true,
        description: 'Per-segment revision counter.',
      },
    },
    {
      name: 'isStable',
      label: 'Stable',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set when this segment is no longer expected to change.',
      },
    },
  ],
}

