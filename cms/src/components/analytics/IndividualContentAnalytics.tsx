'use client'

import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import { useDocumentInfo } from '@payloadcms/ui'

interface IndividualAnalyticsProps {
  contentId?: number
  contentType?: 'livestream' | 'video'
}

interface ContentAnalyticsData {
  totalViews: number
  uniqueViewers: number
  totalWatchTime: number
  averageWatchTime: number
  peakConcurrentViewers?: number
  completionRate?: number
  viewsOverTime: Array<{
    date: string
    views: number
  }>
  deviceBreakdown: Array<{
    name: string
    value: number
  }>
  qualityDistribution: Array<{
    name: string
    value: number
  }>
  topCountries: Array<{
    country: string
    views: number
  }>
  viewerList: Array<{
    viewerName: string
    startedAt: string
    watchDuration: number
    deviceType: string
    quality?: string
  }>
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa']

export default function IndividualContentAnalytics({
  contentId: propContentId,
  contentType: propContentType,
}: IndividualAnalyticsProps) {
  const documentInfo = useDocumentInfo()
  const [data, setData] = useState<ContentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get content ID and type from either props or document context
  const contentId = propContentId || documentInfo.id
  const contentType = propContentType || (documentInfo.collectionSlug === 'live-streams' ? 'livestream' : 'video')

  useEffect(() => {
    async function fetchAnalytics() {
      if (!contentId) {
        setError('No content ID available')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/analytics/content-stats?contentId=${contentId}&contentType=${contentType}`,
        )
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
  }, [contentId, contentType])

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading analytics data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No analytics data available yet. Views will appear here once users start watching.</p>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {contentType === 'livestream' ? 'Live Stream' : 'Video'} Analytics
        </h2>
        <p style={{ color: '#666' }}>Detailed viewer insights and engagement metrics</p>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Views</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{data.totalViews}</p>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Unique Viewers
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{data.uniqueViewers}</p>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Watch Time
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
            {formatDuration(data.totalWatchTime)}
          </p>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Avg Watch Time
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
            {formatDuration(data.averageWatchTime)}
          </p>
        </div>

        {contentType === 'livestream' && data.peakConcurrentViewers !== undefined && (
          <div
            style={{
              background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
              color: 'white',
              padding: '1.25rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              Peak Concurrent
            </h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{data.peakConcurrentViewers}</p>
          </div>
        )}

        {contentType === 'video' && data.completionRate !== undefined && (
          <div
            style={{
              background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
              color: 'white',
              padding: '1.25rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              Completion Rate
            </h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
              {data.completionRate.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Views Over Time */}
        {data.viewsOverTime.length > 0 && (
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Views Over Time
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Device Breakdown */}
        {data.deviceBreakdown.length > 0 && (
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Device Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={250}>
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
        )}

        {/* Quality Distribution */}
        {data.qualityDistribution.length > 0 && (
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Quality Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.qualityDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Countries */}
        {data.topCountries.length > 0 && (
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Top Countries
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topCountries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="#ea580c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Viewer List */}
      {data.viewerList.length > 0 && (
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Recent Viewers ({data.viewerList.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Viewer
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Started At
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Watch Time
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Device
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Quality
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.viewerList.map((viewer, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {viewer.viewerName}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {formatDate(viewer.startedAt)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {formatDuration(viewer.watchDuration)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        {viewer.deviceType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {viewer.quality || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
