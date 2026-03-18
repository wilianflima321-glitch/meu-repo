/**
 * GDPR User Data Export API
 * POST /api/user/export - Export all user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        sessions: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        auditLogs: {
          select: {
            action: true,
            resource: true,
            createdAt: true,
          },
          take: 1000,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Sanitize - remove sensitive fields
    const { password, mfaSecret, mfaBackupCodes, resetToken, verificationToken, ...safeUser } = user as any

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'GDPR_EXPORT_V1',
      user: safeUser,
      metadata: {
        totalProjects: user.projects.length,
        totalAuditLogs: user.auditLogs.length,
        totalSessions: user.sessions.length,
      },
    }

    // Record in audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'gdpr_data_export',
        resource: `user:${auth.userId}`,
        metadata: JSON.stringify({ exportedAt: exportData.exportedAt }),
      },
    })

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="aethel-data-export-${auth.userId}-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error('[user/export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
