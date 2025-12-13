import type { RequestHandler } from '@builder.io/qwik-city'
import { getEnv } from '~/utils/env'
import { isMockAuthEnabled, getMockSessionToken } from '@shared/mock-auth'

export const onPost: RequestHandler = async ({ request, cookie, json }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://localhost:3000')
  console.log('[subscriptions/create] CMS_URL:', cmsUrl)
  console.log('[subscriptions/create] Mock auth enabled:', isMockAuthEnabled())

  // Get nandi_session_token from cookie (or use mock token in development)
  let nandiSessionToken = cookie.get('nandi_session_token')?.value
  
  if (!nandiSessionToken && isMockAuthEnabled()) {
    // In development with mock auth, use a mock token
    nandiSessionToken = getMockSessionToken()
  }

  if (!nandiSessionToken) {
    json(401, { error: 'Not authenticated' })
    return
  }

  try {
    const body = await request.json()
    console.log('[subscriptions/create] Request body:', body)

    // Forward request to CMS
    const response = await fetch(`${cmsUrl}/api/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `nandi_session_token=${nandiSessionToken}`,
      },
      body: JSON.stringify(body),
    })

    console.log('[subscriptions/create] CMS response status:', response.status)
    console.log('[subscriptions/create] CMS response headers:', Object.fromEntries(response.headers.entries()))
    
    // Get response text first to handle non-JSON responses
    let responseText = await response.text()
    console.log('[subscriptions/create] Raw CMS response text (first 300 chars):', responseText.substring(0, 300))
    console.log('[subscriptions/create] Raw CMS response text (last 100 chars):', responseText.slice(-100))
    
    // Clean up potential Qwik dev mode warnings that might have leaked into response
    // Look for JSON content within the response
    const jsonStartMatch = responseText.match(/\{.*$/s)
    if (jsonStartMatch && !responseText.trim().startsWith('{')) {
      console.warn('[subscriptions/create] Response contains non-JSON prefix, extracting JSON portion')
      responseText = jsonStartMatch[0]
    }

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[subscriptions/create] Failed to parse CMS response as JSON:', parseError)
      console.error('[subscriptions/create] Cleaned response text:', responseText)
      json(500, { 
        success: false,
        error: 'Invalid response from CMS', 
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        details: responseText.substring(0, 200)
      })
      return
    }

    json(response.status, data)
  } catch (error: any) {
    console.error('[subscriptions/create] Error:', error)
    json(500, { 
      success: false,
      error: 'Failed to create subscription', 
      message: error.message 
    })
  }
}
