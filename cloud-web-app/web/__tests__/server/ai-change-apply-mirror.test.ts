import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    file: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMocks.prisma }))

import { mirrorAppliedChangesToCanonicalStore } from '@/lib/server/ai-change-apply/mirror-canonical-store'

const savedFileStore = { value: undefined as string | undefined }

beforeEach(() => {
  vi.clearAllMocks()
  savedFileStore.value = process.env.AETHEL_FILE_STORE
  prismaMocks.prisma.file.upsert.mockResolvedValue({
    id: 'f1',
    path: '/src/app.ts',
    content: 'final',
    language: 'typescript',
    updatedAt: new Date('2026-06-05T00:00:00.000Z'),
  })
})

afterEach(() => {
  if (savedFileStore.value === undefined) delete process.env.AETHEL_FILE_STORE
  else process.env.AETHEL_FILE_STORE = savedFileStore.value
})

describe('mirrorAppliedChangesToCanonicalStore', () => {
  it('skips mirroring on the disk-canonical backend (apply already wrote there)', async () => {
    process.env.AETHEL_FILE_STORE = 'disk'
    const result = await mirrorAppliedChangesToCanonicalStore({
      userId: 'u1',
      projectId: 'p1',
      changes: [{ virtualPath: '/src/app.ts', content: 'final', language: 'typescript' }],
    })
    expect(result).toEqual({ mirrored: false, backend: 'disk', count: 0 })
    expect(prismaMocks.prisma.file.upsert).not.toHaveBeenCalled()
  })

  it('mirrors applied changes into the db store on serverless/db backend', async () => {
    process.env.AETHEL_FILE_STORE = 'db'
    const result = await mirrorAppliedChangesToCanonicalStore({
      userId: 'u1',
      projectId: 'p1',
      changes: [
        { virtualPath: '/src/app.ts', content: 'final', language: 'typescript' },
        { virtualPath: '/src/other.ts', content: 'final2' },
      ],
    })
    expect(result.mirrored).toBe(true)
    expect(result.backend).toBe('db')
    expect(result.count).toBe(2)
    expect(prismaMocks.prisma.file.upsert).toHaveBeenCalledTimes(2)
  })
})
