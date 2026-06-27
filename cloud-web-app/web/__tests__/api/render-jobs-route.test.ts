import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
    renderJob: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/db', () => prismaMocks)

import { POST, GET } from '@/app/api/render/jobs/route'

describe('api/render/jobs route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'user@example.com' })
  })

  describe('POST /api/render/jobs', () => {
    it('creates a new render job if project exists', async () => {
      prismaMocks.prisma.project.findFirst.mockResolvedValue({ id: 'project-1' })
      prismaMocks.prisma.renderJob.create.mockResolvedValue({
        id: 'job-1',
        projectId: 'project-1',
        requestedBy: 'user-1',
        status: 'queued',
        progress: 0,
        provider: 'internal',
      })

      const response = await POST(
        new NextRequest('http://localhost:3000/api/render/jobs', {
          method: 'POST',
          body: JSON.stringify({ projectId: 'project-1' }),
        })
      )
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.job.id).toBe('job-1')
      expect(prismaMocks.prisma.renderJob.create).toHaveBeenCalled()
    })

    it('returns 400 if projectId is missing', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/render/jobs', {
          method: 'POST',
          body: JSON.stringify({}),
        })
      )
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/render/jobs', () => {
    it('returns mapped jobs requested by authenticated user', async () => {
      prismaMocks.prisma.renderJob.findMany.mockResolvedValue([
        { id: 'job-1', status: 'processing', progress: 50, requestedBy: 'user-1', projectId: 'project-1' },
        { id: 'job-2', status: 'completed', progress: 100, requestedBy: 'user-1', projectId: 'project-1' },
        { id: 'job-3', status: 'cancelled', progress: 0, requestedBy: 'user-1', projectId: 'project-1' },
      ])

      const response = await GET(
        new NextRequest('http://localhost:3000/api/render/jobs?projectId=project-1')
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(3)
      expect(data.jobs[0]).toMatchObject({ id: 'job-1', status: 'rendering' })
      expect(data.jobs[1]).toMatchObject({ id: 'job-2', status: 'completed' })
      expect(data.jobs[2]).toMatchObject({ id: 'job-3', status: 'failed' })
      expect(prismaMocks.prisma.renderJob.findMany).toHaveBeenCalledWith({
        where: { requestedBy: 'user-1', projectId: 'project-1' },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
