import { NextResponse } from 'next/server'

/**
 * Health check endpoint
 * Used to verify the API is running
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
