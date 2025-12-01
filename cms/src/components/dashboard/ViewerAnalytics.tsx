'use client'

import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsData {
  liveStreamStats: {
    totalSessions: number
    totalWatchTime: number
    averageWatchTime: number
    topStreams: Array<{
      streamTitle: string
      viewCount: number
      totalWatchTime: number
    }>
  }
  videoStats: {
    totalSessions: number
    totalWatchTime: number
    averageWatchTime: number
    topVideos: Array<{
      videoTitle: string
      viewCount: number
      totalWatchTime: number
    }>
  }
  deviceBreakdown: Array<{
    name: string
    value: number
  }>
  viewsOverTime: Array<{
    date: string
    liveViews: number
    videoViews: number
  }>
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa']

export default function ViewerAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics/viewer-stats')
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`)
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="dashboard-analytics">
        <div className="analytics-header">
          <h1>Viewer Analytics</h1>
          <p>Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-analytics">
        <div className="analytics-header">
          <h1>Viewer Analytics</h1>
          <p className="error">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="dashboard-analytics">
        <div className="analytics-header">
          <h1>Viewer Analytics</h1>
          <p>No data available</p>
        </div>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="dashboard-analytics" style={{ padding: '2rem' }}>
      {/* Header */}
      <div className="analytics-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Viewer Analytics Dashboard
        </h1>
        <p style={{ color: '#666' }}>
          Track viewer engagement across livestreams and videos
        </p>
      </div>

      {/* Summary Cards */}
      <div
        className="summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Live Stream Views
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {data.liveStreamStats.totalSessions.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
            Avg: {formatDuration(data.liveStreamStats.averageWatchTime)}
          </p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Video Views
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {data.videoStats.totalSessions.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
            Avg: {formatDuration(data.videoStats.averageWatchTime)}
          </p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Watch Time (Live)
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {formatDuration(data.liveStreamStats.totalWatchTime)}
          </p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Watch Time (Videos)
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {formatDuration(data.videoStats.totalWatchTime)}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        className="charts-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {/* Views Over Time */}
        <div
          className="chart-card"
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Views Over Time (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.viewsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="liveViews"
                stroke="#f97316"
                strokeWidth={2}
                name="Live Stream Views"
              />
              <Line
                type="monotone"
                dataKey="videoViews"
                stroke="#ea580c"
                strokeWidth={2}
                name="Video Views"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Device Breakdown */}
        <div
          className="chart-card"
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Device Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.deviceBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.deviceBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Content Tables */}
      <div
        className="tables-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
        }}
      >
        {/* Top Live Streams */}
        <div
          className="table-card"
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Top Live Streams
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.liveStreamStats.topStreams}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="streamTitle" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="viewCount" fill="#f97316" name="View Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Videos */}
        <div
          className="table-card"
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Top Videos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.videoStats.topVideos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="videoTitle" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="viewCount" fill="#ea580c" name="View Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
