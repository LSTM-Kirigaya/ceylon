import { NextRequest, NextResponse } from 'next/server'

// Mock endpoint for OAuth verification page preview.
// A real implementation would store device-code state and scopes in DB (e.g. cli_auth_requests).
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code') || ''

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  return NextResponse.json({
    request: {
      deviceCode: code ? `mock_device_${code}` : 'mock_device_',
      userCode: code || 'XXXX-XXXX',
      clientName: 'ceylonm CLI',
      scopes: ['projects:read', 'views:read', 'requirements:read', 'requirements:write'],
      expiresAt,
    },
  })
}

