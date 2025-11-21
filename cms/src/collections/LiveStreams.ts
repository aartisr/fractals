import type { CollectionConfig, PayloadRequest } from 'payload'
import type { LiveStream } from '../payload-types'

// Handler to start a live stream
const startStreamHandler = async (req: PayloadRequest) => {
  const id = req.routeParams?.id as string

  if (!id) {
    return Response.json({ error: 'Stream ID is required' }, { status: 400 })
  }

  try {
    // Get the stream document
    const stream = await req.payload.findByID({
      collection: 'live-streams',
      id,
      overrideAccess: true,
    })

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 })
    }

    if (stream.status === 'live') {
      return Response.json({ error: 'Stream is already live' }, { status: 400 })
    }

    // Get live transcoder configuration from env
    const transcoderHost = process.env.LIVE_TRANSCODER_HOST || 'localhost'
    const transcoderPort = process.env.LIVE_TRANSCODER_PORT || '8080'
    const transcoderUrl = `http://${transcoderHost}:${transcoderPort}`

    // Construct RTMP URL if provided, otherwise use default
    const rtmpUrl = stream.rtmpUrl || `rtmp://${transcoderHost}:1935/live/${stream.streamKey}`

    // Call live transcoder API to start the stream
    const response = await fetch(`${transcoderUrl}/api/streams/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamKey: stream.streamKey,
        rtmpUrl: rtmpUrl,
        streamId: stream.id,
        streamId: stream.id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to start stream: ${error}`)
    }

    // Update stream status to live and set startedAt if not already set
    // Update stream status to live and set startedAt if not already set
    const updatedStream = await req.payload.update({
      collection: 'live-streams',
      id,
      data: {
        status: 'live',
        startedAt: stream.startedAt || new Date().toISOString(),
        startedAt: stream.startedAt || new Date().toISOString(),
      },
    })

    return Response.json({
      success: true,
      message: 'Stream started successfully',
      stream: updatedStream,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start stream'
    req.payload.logger.error(`Error starting stream: ${errorMessage}`)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

// Handler to stop a live stream
const stopStreamHandler = async (req: PayloadRequest) => {
  const id = req.routeParams?.id as string

  if (!id) {
    return Response.json({ error: 'Stream ID is required' }, { status: 400 })
  }

  try {
    // Get the stream document
    const stream = await req.payload.findByID({
      collection: 'live-streams',
      id,
    })

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 })
    }

    if (stream.status !== 'live') {
      return Response.json({ error: 'Stream is not currently live' }, { status: 400 })
    }

    // Get live transcoder configuration from env
    const transcoderHost = process.env.LIVE_TRANSCODER_HOST || 'localhost'
    const transcoderPort = process.env.LIVE_TRANSCODER_PORT || '8080'
    const transcoderUrl = `http://${transcoderHost}:${transcoderPort}`

    // Call live transcoder API to stop the stream
    const response = await fetch(`${transcoderUrl}/api/streams/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamKey: stream.streamKey,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to stop stream: ${error}`)
    }

    // Update stream status to ended
    const updatedStream = await req.payload.update({
      collection: 'live-streams',
      id,
      data: {
        status: 'ended',
      },
    })

    return Response.json({
      success: true,
      message: 'Stream stopped successfully',
      stream: updatedStream,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to stop stream'
    req.payload.logger.error(`Error stopping stream: ${errorMessage}`)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

export const LiveStreams: CollectionConfig = {
  slug: 'live-streams',
  access: {
    read: ({ req }) => {
      // Public requests: hide private streams entirely
      if (!req?.user) {
        return {
          visibility: {
            not_equals: 'private',
          },
        }
      }
      // Authenticated (admin/cms) can read all
      return true
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'visibility', 'date'],
  },
  fields: [
    {
      name: 'streamKey',
      label: 'Stream Key',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for this stream. Use this as your stream key in OBS/streaming software.',
      },
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
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'startedAt',
      label: 'Started At',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Actual live start time; used as time zero for transcripts.',
      },
    },
    {
      name: 'startedAt',
      label: 'Started At',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Actual live start time; used as time zero for transcripts.',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'private',
      options: [
        {
          label: 'Public',
          value: 'public',
        },
        {
          label: 'Private',
          value: 'private',
        },
      ],
    },
    {
      name: 'status',
      label: 'Stream Status',
      type: 'select',
      required: true,
      defaultValue: 'idle',
      options: [
        {
          label: 'Idle',
          value: 'idle',
        },
        {
          label: 'Live',
          value: 'live',
        },
        {
          label: 'Ended',
          value: 'ended',
        },
      ],
      admin: {
        readOnly: true,
        description: 'Current status of the stream (controlled by Start/Stop buttons)',
      },
    },
    {
      name: 'transcriptionEnabled',
      label: 'Transcription Enabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Enable live transcription for this stream.',
      },
    },
    {
      name: 'transcriptionLanguage',
      label: 'Transcription Language',
      type: 'text',
      defaultValue: 'en',
      admin: {
        description: 'Language code for live transcription (e.g. en, ta).',
      },
    },
    {
      name: 'rtmpUrl',
      label: 'RTMP Source URL',
      type: 'text',
      access: {
        // Allow authenticated users (admin UI, server handlers) to read; public cannot
        read: ({ req }) => Boolean(req?.user),
      },
      admin: {
        description: 'Optional RTMP source URL. Leave empty if streaming directly to this server.',
      },
    },
    {
      name: 'masterPlaylistUrl',
      label: 'Master Playlist URL',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'HLS master playlist URL (generated automatically)',
      },
    },
    {
      name: 'thumbnailUrl',
      label: 'Thumbnail URL',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Thumbnail URL (uploaded via the thumbnail uploader below)',
      },
    },
    {
      name: 'thumbnailUploader',
      type: 'ui',
      admin: {
        components: {
          Field: './collections/components/ThumbnailUploader#ThumbnailUploaderComponent',
        },
      },
    },
    {
      name: 'streamControls',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: './collections/components/StreamControls#StreamControlsComponent',
        },
      },
    },
  ],
  endpoints: [
    {
      path: '/:id/start',
      method: 'post',
      handler: startStreamHandler,
    },
    {
      path: '/:id/stop',
      method: 'post',
      handler: stopStreamHandler,
    },
    {
      path: '/:id/transcription/start',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          await req.payload.update({
            collection: 'live-streams',
            id,
            data: { transcriptionEnabled: true },
            overrideAccess: true,
          })

          return Response.json({ success: true }, { status: 200 })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to enable transcription'
          req.payload.logger.error(`Error enabling transcription: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/transcription/stop',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          await req.payload.update({
            collection: 'live-streams',
            id,
            data: { transcriptionEnabled: false },
            overrideAccess: true,
          })

          return Response.json({ success: true }, { status: 200 })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to disable transcription'
          req.payload.logger.error(`Error disabling transcription: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/transcription/start',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          await req.payload.update({
            collection: 'live-streams',
            id,
            data: { transcriptionEnabled: true },
            overrideAccess: true,
          })

          return Response.json({ success: true }, { status: 200 })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to enable transcription'
          req.payload.logger.error(`Error enabling transcription: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/transcription/stop',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          await req.payload.update({
            collection: 'live-streams',
            id,
            data: { transcriptionEnabled: false },
            overrideAccess: true,
          })

          return Response.json({ success: true }, { status: 200 })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to disable transcription'
          req.payload.logger.error(`Error disabling transcription: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/thumbnail',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string

        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          // Get the stream document
          const stream = await req.payload.findByID({
            collection: 'live-streams',
            id,
          })

          if (!stream) {
            return Response.json({ error: 'Stream not found' }, { status: 404 })
          }

          // Get the uploaded file from the request
          if (!req.formData) {
            return Response.json({ error: 'Invalid request format' }, { status: 400 })
          }

          const formData = await req.formData()
          const file = formData.get('thumbnail')

          if (!file) {
            return Response.json({ error: 'No file uploaded' }, { status: 400 })
          }

          // Get live transcoder configuration from env
          const transcoderHost = process.env.LIVE_TRANSCODER_HOST || 'localhost'
          const transcoderPort = process.env.LIVE_TRANSCODER_PORT || '8080'
          const transcoderUrl = `http://${transcoderHost}:${transcoderPort}`

          // Forward the file to the transcoder
          const uploadFormData = new FormData()
          uploadFormData.append('thumbnail', file)

          const response = await fetch(`${transcoderUrl}/api/streams/${stream.streamKey}/thumbnail`, {
            method: 'POST',
            body: uploadFormData,
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Failed to upload thumbnail: ${error}`)
          }

          const data = await response.json()

          // Update the stream document with the new thumbnail URL
          const updatedStream = await req.payload.update({
            collection: 'live-streams',
            id,
            data: {
              thumbnailUrl: data.thumbnailUrl,
            },
          })

          return Response.json({
            success: true,
            thumbnailUrl: data.thumbnailUrl,
            stream: updatedStream,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload thumbnail'
          req.payload.logger.error(`Error uploading thumbnail: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/sync-status',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        const id = req.routeParams?.id as string
        if (!id) {
          return Response.json({ error: 'Stream ID is required' }, { status: 400 })
        }

        try {
          const stream = await req.payload.findByID({
            collection: 'live-streams',
            id,
            overrideAccess: true,
          })

          if (!stream) {
            return Response.json({ error: 'Stream not found' }, { status: 404 })
          }

          const transcoderHost = process.env.LIVE_TRANSCODER_HOST || 'localhost'
          const transcoderPort = process.env.LIVE_TRANSCODER_PORT || '8080'
          const transcoderUrl = `http://${transcoderHost}:${transcoderPort}`

          // Ask transcoder for current status
          const statusResp = await fetch(`${transcoderUrl}/api/streams/${stream.streamKey}`)
          if (!statusResp.ok) {
            const text = await statusResp.text()
            throw new Error(`Transcoder status error: ${statusResp.status} ${text}`)
          }
          const statusJSON: any = await statusResp.json()

          const running: boolean = Boolean(statusJSON?.running)
          const nextStatus: 'idle' | 'live' | 'ended' = running ? 'live' : 'idle'
          let updated = false

          if (stream.status !== nextStatus) {
            await req.payload.update({
              collection: 'live-streams',
              id,
              data: { status: nextStatus },
              overrideAccess: true,
            })
            updated = true
          }

          return Response.json({ success: true, running, status: nextStatus, updated })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to sync status'
          req.payload.logger.error(`Error syncing stream status: ${errorMessage}`)
          return Response.json({ error: errorMessage }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Set master playlist URL when stream goes live
        if (data.status === 'live' && !data.masterPlaylistUrl && data.streamKey) {
          const mediaBaseUrl = req?.payload?.config?.custom?.mediaBaseUrl || process.env.MEDIA_BASE_URL || 'https://cdn.url'
          data.masterPlaylistUrl = `${mediaBaseUrl}/${data.streamKey}/master.m3u8`
        }
        return data
      },
    ],
  },
}
