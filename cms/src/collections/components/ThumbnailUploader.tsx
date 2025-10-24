'use client'

import React, { useState } from 'react'
import { useFormFields, useDocumentInfo, useForm } from '@payloadcms/ui'
import { Button } from '@payloadcms/ui'

export const ThumbnailUploaderComponent: React.FC = () => {
  const { id } = useDocumentInfo()
  const streamKey = useFormFields(([fields]) => fields?.streamKey?.value as string)
  const thumbnailUrl = useFormFields(([fields]) => fields?.thumbnailUrl?.value as string)
  const { dispatchFields } = useForm()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 2MB' })
      return
    }

    setSelectedFile(file)
    setMessage(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!streamKey) {
      setMessage({ type: 'error', text: 'Please save the document first to generate a stream key' })
      return
    }

    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file first' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('thumbnail', selectedFile)

      // Upload via Payload endpoint (server-side proxy to transcoder)
      const response = await fetch(`/api/live-streams/${id}/thumbnail`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload thumbnail')
      }

      const data = await response.json()
      const newThumbnailUrl = data.thumbnailUrl

      setMessage({ type: 'success', text: 'Thumbnail uploaded successfully!' })

      // Update the thumbnailUrl field in the form
      dispatchFields({
        type: 'UPDATE',
        path: 'thumbnailUrl',
        value: newThumbnailUrl,
      })

      // Clear the selection
      setSelectedFile(null)
      setPreview(null)

      // Note: The server endpoint already updated the document
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload thumbnail'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #e1e4e8', borderRadius: '4px', marginTop: '16px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Thumbnail</h4>

      {thumbnailUrl && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Current thumbnail:</p>
          <img
            src={thumbnailUrl}
            alt="Stream thumbnail"
            style={{ maxWidth: '400px', maxHeight: '200px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      )}

      {preview && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Preview:</p>
          <img
            src={preview}
            alt="Preview"
            style={{ maxWidth: '400px', maxHeight: '200px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading || !streamKey}
          style={{ display: 'block', marginBottom: '8px' }}
        />
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
          Accepts: JPG, PNG, WebP. Max size: 2MB. Will be converted to WebP.
        </p>
        {!streamKey && (
          <p style={{ fontSize: '12px', color: '#d73a49', margin: '4px 0' }}>
            ⚠️ Save the document first to enable thumbnail upload
          </p>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={loading || !selectedFile || !streamKey}
        buttonStyle="primary"
        size="small"
      >
        {loading ? 'Uploading...' : '📤 Upload Thumbnail'}
      </Button>

      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
