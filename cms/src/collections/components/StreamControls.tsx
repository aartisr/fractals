'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useFormFields, useDocumentInfo, Button } from '@payloadcms/ui'
import './StreamControls.css'

interface EndingStatus {
  phase: string
  message: string
  progress?: number
  startedAt?: string
  updatedAt?: string
  completedAt?: string
}

export const StreamControlsComponent: React.FC = () => {
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) => fields?.status?.value as string)
  const streamKey = useFormFields(([fields]) => fields?.streamKey?.value as string)
  const masterPlaylistUrl = useFormFields(([fields]) => fields?.masterPlaylistUrl?.value as string)
  const endingStatus = useFormFields(([fields]) => fields?.endingStatus?.value as EndingStatus)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const hasReloadedRef = useRef(false)

  // On mount, sync status with live-transcoder and update record if out of sync
  // Skip sync if stream has already ended to prevent infinite reload loops
  useEffect(() => {
    const sync = async () => {
      if (!id) return
      // Don't sync if stream has already ended - this prevents reload loops
      if (status === 'ended') return

      try {
        const resp = await fetch(`/api/live-streams/${id}/sync-status`)
        const data = await resp.json()
        if (!resp.ok || data?.error) {
          setMessage({ type: 'error', text: data?.error || `Sync failed: ${resp.status}` })
          setTimeout(() => setMessage(null), 2000)
          return
        }
        if (data.updated) {
          setMessage({ type: 'success', text: 'Status synced. Refreshing…' })
          setTimeout(() => window.location.reload(), 1000)
        }
      } catch (e) {
        setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Sync failed' })
        setTimeout(() => setMessage(null), 2000)
      }
    }
    sync()
  }, [id, status])

  // Auto-refresh when stream status changes from 'ending' to 'ended'
  // Only reload once to prevent infinite reload loops
  useEffect(() => {
    if (status === 'ended' && endingStatus?.completedAt && !hasReloadedRef.current) {
      hasReloadedRef.current = true
      setMessage({ type: 'success', text: 'Stream ended gracefully! Refreshing...' })
      setTimeout(() => window.location.reload(), 1500)
    }
  }, [status, endingStatus])

  const handleStartStream = async () => {
    if (!id) {
      setMessage({ type: 'error', text: 'Stream ID not found' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/live-streams/${id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start stream')
      }

      setMessage({ type: 'success', text: 'Stream started successfully! Refreshing...' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start stream'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleEndStream = async () => {
    if (!id) {
      setMessage({ type: 'error', text: 'Stream ID not found' })
      return
    }

    if (!confirm('Are you sure you want to end this stream? This will stop the transcoder and mark the stream as ended.')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const stopResponse = await fetch(`/api/live-streams/${id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const stopData = await stopResponse.json()

      if (!stopResponse.ok) {
        throw new Error(stopData.error || 'Failed to stop transcoder')
      }

      setMessage({ type: 'info', text: 'Initiating graceful shutdown. Please wait...' })
      // Don't refresh - let polling handle it
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end stream'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className="stream-controls">
      <h3 className="stream-controls__title">Stream Controls</h3>

      <div className="stream-controls__status">
        <span className="stream-controls__status-label">Status:</span>
        <span className={`stream-controls__status-badge stream-controls__status-badge--${status}`}>
          {status === 'live' ? '🔴 Live' : status === 'ending' ? '⏳ Ending...' : status === 'ended' ? '✓ Ended' : 'Idle'}
        </span>
      </div>

      {status === 'ending' && endingStatus && (
        <div className="stream-controls__ending-progress">
          <div className="stream-controls__ending-message">
            <strong>{endingStatus.message}</strong>
          </div>
          {endingStatus.progress !== undefined && (
            <div className="stream-controls__progress-bar">
              <div
                className="stream-controls__progress-fill"
                style={{ width: `${endingStatus.progress}%` }}
              />
            </div>
          )}
          <div className="stream-controls__ending-details">
            Phase: {endingStatus.phase}
          </div>
        </div>
      )}

      {streamKey && (
        <div className="stream-controls__info">
          <p className="stream-controls__info-label">Stream Key:</p>
          <div className="stream-controls__info-value">
            <code>{streamKey}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(streamKey)}
              className="stream-controls__copy-btn"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {masterPlaylistUrl && (
        <div className="stream-controls__info">
          <p className="stream-controls__info-label">HLS URL:</p>
          <div className="stream-controls__info-value">
            <code className="stream-controls__url">{masterPlaylistUrl}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(masterPlaylistUrl)}
              className="stream-controls__copy-btn"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="stream-controls__actions">
        {status !== 'live' && status !== 'ended' && status !== 'ending' && (
          <Button
            onClick={handleStartStream}
            disabled={loading || !streamKey}
            buttonStyle="primary"
            size="medium"
          >
            {loading ? 'Starting...' : 'Start Stream'}
          </Button>
        )}

        {status === 'live' && (
          <Button
            onClick={handleEndStream}
            disabled={loading}
            buttonStyle="secondary"
            size="medium"
          >
            {loading ? 'Ending...' : 'End Stream'}
          </Button>
        )}

        {status === 'ending' && (
          <div className="stream-controls__ending-notice">
            Stream is gracefully shutting down. Please do not close this page.
          </div>
        )}
      </div>

      {message && (
        <div className={`stream-controls__message stream-controls__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {status === 'idle' && (
        <div className="stream-controls__instructions">
          <p><strong>To start streaming:</strong></p>
          <ol>
            <li>Save this document first</li>
            <li>Click &quot;Start Stream&quot; button</li>
            <li>Configure your streaming software (OBS, etc.) with the stream key above</li>
            <li>Start broadcasting to the RTMP server</li>
          </ol>
        </div>
      )}
    </div>
  )
}
