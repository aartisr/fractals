import type { CollectionConfig, PayloadRequest } from 'payload'

type AddComputedArgs = { doc: any; req: PayloadRequest }

const addComputedURLs = async ({ doc, req }: AddComputedArgs) => {
  const base = req?.payload?.config?.custom?.mediaBaseUrl
    || process.env.MEDIA_BASE_URL
    || 'cdn.url'
  const id = doc.videoId
  if (!id) return doc

  // expose computed URLs on API responses (not stored in DB)
  doc.thumbnail = `${base}/${id}/thumbnail.webp`
  doc.masterUrl = `${base}/${id}/master.m3u8`

  const resolutions: string[] = Array.isArray(doc.resolutions) && doc.resolutions.length
    ? doc.resolutions
    : ['1080p', '720p', '480p', '360p', '240p']

  doc.playlists = resolutions.map((r) => ({
    resolution: r,
    url: `${base}/${id}/${r}/playlist.m3u8`,
  }))

  return doc
}

export const Videos: CollectionConfig = {
  slug: 'videos',
  access: {
    read: () => true,
    create: ({ req }) => {
      // Allow authenticated users (including API key auth)
      return Boolean(req.user)
    },
    update: ({ req }) => {
      return Boolean(req.user)
    },
    delete: ({ req }) => {
      return Boolean(req.user)
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'date'],
    components: {
      views: {
        edit: {
          analytics: {
            Component: '/components/analytics/IndividualContentAnalytics#default',
            path: '/analytics',
            tab: {
              label: 'Analytics',
            },
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'videoId',
      label: 'Video ID',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'duration',
      type: 'text',
    },
    {
      name: 'date',
      type: 'date',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      hasMany: true,
    },
    {
      name: 'resolutions',
      label: 'Available Resolutions',
      type: 'select',
      hasMany: true,
      options: [
        { label: '1080p', value: '1080p' },
        { label: '720p', value: '720p' },
        { label: '480p', value: '480p' },
        { label: '360p', value: '360p' },
        { label: '240p', value: '240p' },
      ],
      defaultValue: ['1080p', '720p', '480p', '360p', '240p'],
      admin: {
        isClearable: true,
        description: 'Optional. Defaults to common resolutions.'
      },
    },
  ],
  hooks: {
    afterRead: [addComputedURLs],
  },
}
