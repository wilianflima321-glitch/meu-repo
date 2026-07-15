/**
 * Startup Health Check API - Aethel Engine
 * GET /api/health/startup - Kubernetes-style startup probe
 * Reports whether the application has completed initialization.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let startupComplete = false
let startupTimestamp: string | null = null

export async function GET() {
  if (!startupComplete) {
    // Mark startup as complete on first successful request
    startupComplete = true
    startupTimestamp = new Date().toISOString()
  }

  return NextResponse.json(
    {
      status: 'started',
      startupComplete,
      startupTimestamp,
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-cache, no-store' },
    }
  )
}
