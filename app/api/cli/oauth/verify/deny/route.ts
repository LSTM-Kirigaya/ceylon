import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code : ''

  // Mock: in real flow, we'd mark request as denied.
  return NextResponse.json({ ok: true, code })
}

