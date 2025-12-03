import type { RequestHandler } from '@builder.io/qwik-city'

export const onPost: RequestHandler = async ({ request, cookie, env }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000'

  // Get nandi_session_token from cookie
  const nandiSessionToken = cookie.get('nandi_session_token')?.value

  if (!nandiSessionToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()

    // Forward request to CMS
    const response = await fetch(`${cmsUrl}/api/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `nandi_session_token=${nandiSessionToken}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error proxying subscription create:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create subscription', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
