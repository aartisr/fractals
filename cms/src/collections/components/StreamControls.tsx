'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useDocumentInfo, Button } from '@payloadcms/ui'
import './StreamControls.css'

export const StreamControlsComponent: React.FC = () => {
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) => fields?.status?.value as string)
  const streamKey = useFormFields(([fields]) => fields?.streamKey?.value as string)
  const masterPlaylistUrl = useFormFields(([fields]) => fields?.masterPlaylistUrl?.value as string)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // On mount, sync status with live-transcoder and update record if out of sync
  useEffect(() => {
    const sync = async () => {
      if (!id) return
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
  }, [id])

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
      // First, stop the transcoder
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

      setMessage({ type: 'success', text: 'Stream ended successfully! Refreshing...' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end stream'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
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
          {status === 'live' ? 'Live' : status === 'ended' ? 'Ended' : 'Idle'}
        </span>
      </div>

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
        {status !== 'live' && status !== 'ended' && (
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
