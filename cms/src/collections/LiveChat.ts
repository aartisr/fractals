import type { CollectionConfig } from 'payload'

export const LiveChat: CollectionConfig = {
  slug: 'live-chat',
  access: {
    // Public read access - anyone can view chat messages
    read: () => true,
    // Only authenticated users can create messages
    create: ({ req: { user } }) => Boolean(user),
    // Only admins can update (for moderation)
    update: ({ req: { user } }) => Boolean(user),
    // Only admins can delete (soft delete for moderation)
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['content', 'ecitizen', 'stream', 'type', 'createdAt'],
    description: 'Live chat messages for streams',
  },
  fields: [
    {
      name: 'content',
      type: 'text',
      required: true,
      maxLength: 500,
      admin: {
        description: 'Message content (max 500 characters)',
      },
    },
    {
      name: 'ecitizen',
      label: 'E-Citizen',
      type: 'relationship',
      relationTo: 'ecitizen',
      required: true,
      index: true,
      admin: {
        description: 'E-citizen who sent the message',
      },
    },
    {
      name: 'stream',
      label: 'Stream',
      type: 'relationship',
      relationTo: 'live-streams',
      required: true,
      index: true,
      admin: {
        description: 'The live stream this message belongs to',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        {
          label: 'User Message',
          value: 'user',
        },
        {
          label: 'System Message',
          value: 'system',
        },
        {
          label: 'Moderator Message',
          value: 'moderator',
        },
      ],
      admin: {
        description: 'Type of message',
      },
    },
    {
      name: 'deletedAt',
      label: 'Deleted At',
      type: 'date',
      admin: {
        description: 'Soft delete timestamp - set by moderators',
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Log message operations for monitoring
        if (operation === 'create') {
          req.payload.logger.info(`Chat message created: ${doc.id}`)
        } else if (operation === 'update' && doc.deletedAt) {
          req.payload.logger.info(`Chat message deleted: ${doc.id}`)
        }
        return doc
      },
    ],
  },
  timestamps: true, // Adds createdAt and updatedAt automatically
}
