import type { PayloadHandler } from 'payload'

/**
 * GET /api/superchat/stream/:streamId
 * Get superchats for a specific stream
 *
 * Query params:
 * - limit: number of superchats to return (default: 50)
 * - page: page number (default: 1)
 * - pinnedOnly: boolean - only return pinned superchats (default: false)
 *
 * Returns:
 * - superchats: array of superchat objects
 * - totalDocs: total number of superchats
 * - page: current page
 * - totalPages: total pages
 * - pinnedSuperchats: currently pinned superchats (if pinnedOnly is false)
 */
export const getStreamSuperchats: PayloadHandler = async (req) => {
  const { payload } = req
  // Extract stream ID from URL path
  const url = new URL(req.url || '', 'http://localhost')
  const pathParts = url.pathname.split('/')
  const streamId = pathParts[pathParts.indexOf('stream') + 1]

  const { limit = 50, page = 1, pinnedOnly = false } = req.query

  if (!streamId) {
    return Response.json({ error: 'Stream ID is required' }, { status: 400 })
  }

  try {
    // Verify stream exists
    const stream = await payload.findByID({
      collection: 'live-streams',
      id: streamId,
    })

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 })
    }

    const whereClause: any = {
      and: [
        {
          stream: {
            equals: streamId,
          },
        },
        {
          is_visible: {
            equals: true,
          },
        },
        {
          status: {
            equals: 'success',
          },
        },
      ],
    }

    if (pinnedOnly === 'true' || pinnedOnly === true) {
      whereClause.and.push({
        is_pinned: {
          equals: true,
        },
      })
      whereClause.and.push({
        pinned_until: {
          greater_than: new Date().toISOString(),
        },
      })
    }

    // Get superchats
    const superchats = await payload.find({
      collection: 'superchat-messages',
      where: whereClause,
      limit: Number(limit),
      page: Number(page),
      sort: '-createdAt',
    })

    // If not requesting pinned only, also get currently pinned superchats separately
    let pinnedSuperchats: any[] = []
    if (pinnedOnly !== 'true' && pinnedOnly !== true) {
      const pinned = await payload.find({
        collection: 'superchat-messages',
        where: {
          and: [
            {
              stream: {
                equals: streamId,
              },
            },
            {
              is_visible: {
                equals: true,
              },
            },
            {
              is_pinned: {
                equals: true,
              },
            },
            {
              pinned_until: {
                greater_than: new Date().toISOString(),
              },
            },
          ],
        },
        sort: '-amount', // Highest amount first
        limit: 5, // Maximum 5 pinned at once
      })

      pinnedSuperchats = pinned.docs
    }

    return Response.json({
      superchats: superchats.docs,
      totalDocs: superchats.totalDocs,
      page: superchats.page,
      totalPages: superchats.totalPages,
      pinnedSuperchats,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error getting stream superchats:', error)
    return Response.json({
      error: 'Failed to get stream superchats',
      message: error.message,
    }, { status: 500 })
  }
}

/**
 * PATCH /api/superchat/:id/visibility
 * Toggle superchat visibility (admin only)
 *
 * Request body:
 * - is_visible: boolean
 *
 * Returns:
 * - success: boolean
 * - superchat: updated superchat object
 */
export const toggleSuperchatVisibility: PayloadHandler = async (req) => {
  const { payload, user } = req
  // Extract ID from URL path
  const url = new URL(req.url || '', 'http://localhost')
  const pathParts = url.pathname.split('/')
  const visibilityIndex = pathParts.indexOf('visibility')
  const id = pathParts[visibilityIndex - 1]

  const body = req.json ? await req.json() : {}
  const { is_visible } = body

  // Only admins and moderators can toggle superchat visibility
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return Response.json({
      error: 'Forbidden - only admins and moderators can toggle superchat visibility'
    }, { status: 403 })
  }

  if (!id) {
    return Response.json({ error: 'Superchat ID is required' }, { status: 400 })
  }

  if (typeof is_visible !== 'boolean') {
    return Response.json({ error: 'is_visible must be a boolean' }, { status: 400 })
  }

  try {
    const updatedSuperchat = await payload.update({
      collection: 'superchat-messages',
      id: id,
      data: {
        is_visible,
        is_pinned: is_visible ? undefined : false, // Unpin if hiding
      },
    })

    return Response.json({
      success: true,
      superchat: updatedSuperchat,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error toggling superchat visibility:', error)
    return Response.json({
      error: 'Failed to toggle superchat visibility',
      message: error.message,
    }, { status: 500 })
  }
}
