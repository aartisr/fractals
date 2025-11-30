import type { CollectionConfig } from 'payload'

export const LiveStreamViews: CollectionConfig = {
  slug: 'live-stream-views',
  access: {
    // Allow authenticated users and API key access
    read: () => true, // Allow API to read viewer data
    create: () => true, // Allow API to create view sessions
    update: () => true, // Allow API to update session end times
    delete: ({ req: { user } }) => Boolean(user), // Only authenticated admins can delete
  },
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['stream', 'viewerName', 'startedAt', 'endedAt', 'watchDurationSeconds'],
    description: 'Live stream viewer sessions and analytics',
    group: 'Analytics',
  },
  fields: [
    {
      name: 'sessionId',
      label: 'Session ID',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique session identifier (UUID generated on client)',
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
        description: 'The live stream being viewed',
      },
    },
    {
      name: 'ecitizen',
      label: 'E-Citizen',
      type: 'relationship',
      relationTo: 'ecitizen',
      required: false,
      index: true,
      admin: {
        description: 'Authenticated user (if logged in)',
      },
    },
    {
      name: 'viewerName',
      label: 'Viewer Name',
      type: 'text',
      required: false,
      admin: {
        description: 'Display name for anonymous viewers or authenticated user name',
      },
    },
    {
      name: 'ipAddress',
      label: 'IP Address',
      type: 'text',
      required: false,
      admin: {
        description: 'Viewer IP address (for analytics)',
      },
    },
    {
      name: 'userAgent',
      label: 'User Agent',
      type: 'text',
      required: false,
      admin: {
        description: 'Browser/device user agent',
      },
    },
    {
      name: 'deviceType',
      label: 'Device Type',
      type: 'select',
      required: false,
      options: [
        {
          label: 'Desktop',
          value: 'desktop',
        },
        {
          label: 'Mobile',
          value: 'mobile',
        },
        {
          label: 'Tablet',
          value: 'tablet',
        },
        {
          label: 'Unknown',
          value: 'unknown',
        },
      ],
      admin: {
        description: 'Detected device type',
      },
    },
    {
      name: 'country',
      label: 'Country',
      type: 'text',
      required: false,
      admin: {
        description: 'Country from IP geolocation (optional)',
      },
    },
    {
      name: 'quality',
      label: 'Video Quality',
      type: 'text',
      required: false,
      admin: {
        description: 'Video quality selected (e.g., 1080p, 720p, auto)',
      },
    },
    {
      name: 'startedAt',
      label: 'Session Started At',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      index: true,
      admin: {
        description: 'When the viewer joined the stream',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endedAt',
      label: 'Session Ended At',
      type: 'date',
      required: false,
      admin: {
        description: 'When the viewer left the stream',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'lastHeartbeatAt',
      label: 'Last Heartbeat At',
      type: 'date',
      required: false,
      index: true,
      admin: {
        description: 'Last time we received a heartbeat from this session',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'watchDurationSeconds',
      label: 'Watch Duration (seconds)',
      type: 'number',
      required: false,
      admin: {
        description: 'Total watch time in seconds (calculated on session end)',
      },
    },
    {
      name: 'isActive',
      label: 'Is Active',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Whether this session is currently active (receiving heartbeats)',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Log session operations for monitoring
        if (operation === 'create') {
          req.payload.logger.info(`Viewer session created: ${doc.sessionId} for stream ${doc.stream}`)
        } else if (operation === 'update' && doc.endedAt && !doc.isActive) {
          req.payload.logger.info(
            `Viewer session ended: ${doc.sessionId}, duration: ${doc.watchDurationSeconds}s`,
          )
        }
        return doc
      },
    ],
  },
  timestamps: true, // Adds createdAt and updatedAt automatically
}
