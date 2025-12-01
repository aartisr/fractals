import type { PayloadHandler, PayloadRequest } from 'payload'

interface ViewerSession {
  id: number
  stream?: number | { id: number; title: string }
  video?: number | { id: number; title: string }
  deviceType?: string
  watchDurationSeconds?: number
  createdAt: string
  startedAt: string
  endedAt?: string
  ecitizen?: number
  ipAddress?: string
  country?: string
  quality?: string
  viewerName?: string
}

export const getContentAnalytics: PayloadHandler = async (req: PayloadRequest) => {
  try {
    const contentId = req.query.contentId as string
    const contentType = (req.query.contentType as string) || 'livestream'

    if (!contentId) {
      return Response.json({ error: 'contentId is required' }, { status: 400 })
    }

    const collection = contentType === 'video' ? 'video-views' : 'live-stream-views'

    // Fetch all views for this content
    const views = await req.payload.find({
      collection,
      depth: 0,
      limit: 10000,
      where: {
        [contentType === 'video' ? 'video' : 'stream']: {
          equals: parseInt(contentId, 10),
        },
      },
    })

    const sessions = views.docs as ViewerSession[]

    if (sessions.length === 0) {
      return Response.json({
        totalViews: 0,
        uniqueViewers: 0,
        totalWatchTime: 0,
        averageWatchTime: 0,
        viewsOverTime: [],
        deviceBreakdown: [],
        qualityDistribution: [],
        topCountries: [],
        viewerList: [],
      })
    }

    // Calculate stats
    const totalViews = sessions.length
    const totalWatchTime = sessions.reduce(
      (sum, session) => sum + (session.watchDurationSeconds || 0),
      0,
    )
    const averageWatchTime = totalViews > 0 ? Math.round(totalWatchTime / totalViews) : 0

    // Unique viewers (based on ecitizen ID or IP address)
    const uniqueViewerIds = new Set<string>()
    sessions.forEach((session) => {
      const identifier = session.ecitizen?.toString() || session.ipAddress || 'unknown'
      uniqueViewerIds.add(identifier)
    })
    const uniqueViewers = uniqueViewerIds.size

    // Peak concurrent viewers (for livestreams)
    let peakConcurrentViewers = 0
    if (contentType === 'livestream') {
      // Group sessions by timestamp intervals and count overlaps
      const activeSessionsByTime = new Map<number, number>()
      sessions.forEach((session) => {
        const start = new Date(session.startedAt).getTime()
        const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now()

        // Sample every minute
        for (let time = start; time <= end; time += 60000) {
          const key = Math.floor(time / 60000)
          activeSessionsByTime.set(key, (activeSessionsByTime.get(key) || 0) + 1)
        }
      })

      peakConcurrentViewers = Math.max(...activeSessionsByTime.values(), 0)
    }

    // Device breakdown
    const deviceCounts = new Map<string, number>()
    sessions.forEach((session) => {
      const device = session.deviceType || 'unknown'
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)
    })
    const deviceBreakdown = Array.from(deviceCounts.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    // Quality distribution
    const qualityCounts = new Map<string, number>()
    sessions.forEach((session) => {
      const quality = session.quality || 'auto'
      qualityCounts.set(quality, (qualityCounts.get(quality) || 0) + 1)
    })
    const qualityDistribution = Array.from(qualityCounts.entries()).map(([name, value]) => ({
      name,
      value,
    }))

    // Top countries
    const countryCounts = new Map<string, number>()
    sessions.forEach((session) => {
      const country = session.country || 'Unknown'
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
    })
    const topCountries = Array.from(countryCounts.entries())
      .map(([country, views]) => ({ country, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Views over time (daily)
    const dailyViews = new Map<string, number>()
    sessions.forEach((session) => {
      const dateStr = new Date(session.createdAt).toISOString().split('T')[0]
      dailyViews.set(dateStr, (dailyViews.get(dateStr) || 0) + 1)
    })
    const viewsOverTime = Array.from(dailyViews.entries())
      .map(([date, views]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Recent viewer list (last 50)
    const viewerList = sessions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 50)
      .map((session) => ({
        viewerName: session.viewerName || 'Anonymous',
        startedAt: session.startedAt,
        watchDuration: session.watchDurationSeconds || 0,
        deviceType: session.deviceType || 'unknown',
        quality: session.quality,
      }))

    return Response.json({
      totalViews,
      uniqueViewers,
      totalWatchTime,
      averageWatchTime,
      peakConcurrentViewers: contentType === 'livestream' ? peakConcurrentViewers : undefined,
      viewsOverTime,
      deviceBreakdown,
      qualityDistribution,
      topCountries,
      viewerList,
    })
  } catch (error) {
    req.payload.logger.error('Content analytics endpoint error:', error)
    return Response.json({ error: 'Failed to fetch content analytics' }, { status: 500 })
  }
}
