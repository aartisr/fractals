import type { PayloadHandler, PayloadRequest } from 'payload'

interface ViewerSession {
  id: number
  stream?: number | { id: number; title: string }
  video?: number | { id: number; title: string }
  deviceType?: string
  watchDurationSeconds?: number
  createdAt: string
  startedAt: string
}

export const getOverallAnalytics: PayloadHandler = async (req: PayloadRequest) => {
  try {
    // Get date range (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch live stream views
    const liveStreamViews = await req.payload.find({
      collection: 'live-stream-views',
      depth: 1,
      limit: 10000,
      where: {
        createdAt: {
          greater_than_equal: thirtyDaysAgo.toISOString(),
        },
      },
    })

    // Fetch video views
    const videoViews = await req.payload.find({
      collection: 'video-views',
      depth: 1,
      limit: 10000,
      where: {
        createdAt: {
          greater_than_equal: thirtyDaysAgo.toISOString(),
        },
      },
    })

    // Calculate live stream stats
    const liveStreamSessions = liveStreamViews.docs as ViewerSession[]
    const totalLiveSessions = liveStreamSessions.length
    const totalLiveWatchTime = liveStreamSessions.reduce(
      (sum, session) => sum + (session.watchDurationSeconds || 0),
      0,
    )
    const avgLiveWatchTime = totalLiveSessions > 0 ? totalLiveWatchTime / totalLiveSessions : 0

    // Calculate video stats
    const videoSessions = videoViews.docs as ViewerSession[]
    const totalVideoSessions = videoSessions.length
    const totalVideoWatchTime = videoSessions.reduce(
      (sum, session) => sum + (session.watchDurationSeconds || 0),
      0,
    )
    const avgVideoWatchTime =
      totalVideoSessions > 0 ? totalVideoWatchTime / totalVideoSessions : 0

    // Get top live streams
    const streamViewCounts = new Map<
      number,
      { title: string; count: number; totalTime: number }
    >()
    liveStreamSessions.forEach((session) => {
      if (session.stream) {
        const streamId = typeof session.stream === 'object' ? session.stream.id : session.stream
        const streamTitle =
          typeof session.stream === 'object' ? session.stream.title : `Stream ${streamId}`

        const existing = streamViewCounts.get(streamId) || {
          title: streamTitle,
          count: 0,
          totalTime: 0,
        }
        streamViewCounts.set(streamId, {
          title: streamTitle,
          count: existing.count + 1,
          totalTime: existing.totalTime + (session.watchDurationSeconds || 0),
        })
      }
    })

    const topStreams = Array.from(streamViewCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((stream) => ({
        streamTitle: stream.title,
        viewCount: stream.count,
        totalWatchTime: stream.totalTime,
      }))

    // Get top videos
    const videoViewCounts = new Map<
      number,
      { title: string; count: number; totalTime: number }
    >()
    videoSessions.forEach((session) => {
      if (session.video) {
        const videoId = typeof session.video === 'object' ? session.video.id : session.video
        const videoTitle =
          typeof session.video === 'object' ? session.video.title : `Video ${videoId}`

        const existing = videoViewCounts.get(videoId) || {
          title: videoTitle,
          count: 0,
          totalTime: 0,
        }
        videoViewCounts.set(videoId, {
          title: videoTitle,
          count: existing.count + 1,
          totalTime: existing.totalTime + (session.watchDurationSeconds || 0),
        })
      }
    })

    const topVideos = Array.from(videoViewCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((video) => ({
        videoTitle: video.title,
        viewCount: video.count,
        totalWatchTime: video.totalTime,
      }))

    // Device breakdown
    const deviceCounts = new Map<string, number>()
    ;[...liveStreamSessions, ...videoSessions].forEach((session) => {
      const device = session.deviceType || 'unknown'
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)
    })

    const deviceBreakdown = Array.from(deviceCounts.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    // Views over time (daily aggregation for last 30 days)
    const dailyViews = new Map<string, { liveViews: number; videoViews: number }>()

    // Initialize all dates with zero views
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyViews.set(dateStr, { liveViews: 0, videoViews: 0 })
    }

    // Count live stream views by date
    liveStreamSessions.forEach((session) => {
      const dateStr = new Date(session.createdAt).toISOString().split('T')[0]
      const existing = dailyViews.get(dateStr)
      if (existing) {
        existing.liveViews++
      }
    })

    // Count video views by date
    videoSessions.forEach((session) => {
      const dateStr = new Date(session.createdAt).toISOString().split('T')[0]
      const existing = dailyViews.get(dateStr)
      if (existing) {
        existing.videoViews++
      }
    })

    const viewsOverTime = Array.from(dailyViews.entries())
      .map(([date, views]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        liveViews: views.liveViews,
        videoViews: views.videoViews,
      }))
      .reverse() // Show oldest first

    const response = {
      liveStreamStats: {
        totalSessions: totalLiveSessions,
        totalWatchTime: totalLiveWatchTime,
        averageWatchTime: Math.round(avgLiveWatchTime),
        topStreams,
      },
      videoStats: {
        totalSessions: totalVideoSessions,
        totalWatchTime: totalVideoWatchTime,
        averageWatchTime: Math.round(avgVideoWatchTime),
        topVideos,
      },
      deviceBreakdown,
      viewsOverTime,
    }

    return Response.json(response)
  } catch (error) {
    req.payload.logger.error('Analytics endpoint error:', error)
    return Response.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}
