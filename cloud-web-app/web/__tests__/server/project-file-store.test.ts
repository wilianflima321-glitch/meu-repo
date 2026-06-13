import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    file: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

const fsMocks = vi.hoisted(() => ({
  runtime: {
    exists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getFileInfo: vi.fn(),
    delete: vi.fn(),
  },
  getFileSystemRuntime: vi.fn(),
}))

const scopeMocks = vi.hoisted(() => ({
  resolveScopedWorkspacePath: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMocks.prisma }))
vi.mock('@/lib/server/filesystem-runtime', () => ({ getFileSystemRuntime: fsMocks.getFileSystemRuntime }))
vi.mock('@/lib/server/workspace-scope', () => scopeMocks)

import { DbProjectFileStore } from '@/lib/server/project-file-store/db-store'
import { DiskProjectFileStore } from '@/lib/server/project-file-store/disk-store'
import {
  getProjectFileStore,
  isServerlessRuntime,
  selectProjectFileBackend,
} from '@/lib/server/project-file-store'

const ENV_KEYS = ['AETHEL_FILE_STORE', 'VERCEL', 'NETLIFY', 'AWS_LAMBDA_FUNCTION_NAME', 'FUNCTIONS_WORKER_RUNTIME']
const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  fsMocks.getFileSystemRuntime.mockReturnValue(fsMocks.runtime)
  scopeMocks.resolveScopedWorkspacePath.mockImplementation(
    ({ projectId, requestedPath }: { projectId: string; requestedPath: string }) => ({
      absolutePath: `/ws/${projectId}${requestedPath}`,
      root: `/ws/${projectId}`,
    })
  )
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
})

describe('selectProjectFileBackend', () => {
  it('defaults to disk on a non-serverless runtime', () => {
    expect(isServerlessRuntime()).toBe(false)
    expect(selectProjectFileBackend()).toBe('disk')
  })

  it('honors the AETHEL_FILE_STORE override', () => {
    process.env.AETHEL_FILE_STORE = 'db'
    expect(selectProjectFileBackend()).toBe('db')
    process.env.AETHEL_FILE_STORE = 'disk'
    expect(selectProjectFileBackend()).toBe('disk')
  })

  it('uses db on serverless runtimes', () => {
    process.env.VERCEL = '1'
    expect(isServerlessRuntime()).toBe(true)
    expect(selectProjectFileBackend()).toBe('db')
  })

  it('returns a store matching the requested backend', () => {
    expect(getProjectFileStore('db').backend).toBe('db')
    expect(getProjectFileStore('disk').backend).toBe('disk')
  })
})

describe('DbProjectFileStore', () => {
  const store = new DbProjectFileStore()
  const ref = { userId: 'u1', projectId: 'p1', path: 'src/app.ts' }

  it('reads a file with leading-slash fallback', async () => {
    prismaMocks.prisma.file.findFirst.mockResolvedValue({
      id: 'f1',
      path: '/src/app.ts',
      content: 'hello',
      language: 'typescript',
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    const record = await store.read(ref)
    expect(record?.content).toBe('hello')
    expect(prismaMocks.prisma.file.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'p1',
          OR: [{ path: '/src/app.ts' }, { path: 'src/app.ts' }],
        }),
      })
    )
  })

  it('upserts on write using the normalized path', async () => {
    prismaMocks.prisma.file.upsert.mockResolvedValue({
      id: 'f1',
      path: '/src/app.ts',
      content: 'next',
      language: 'typescript',
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    })
    const record = await store.write(ref, 'next', { language: 'typescript' })
    expect(record.id).toBe('f1')
    expect(prismaMocks.prisma.file.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_path: { projectId: 'p1', path: '/src/app.ts' } },
      })
    )
  })

  it('reports delete success based on affected rows', async () => {
    prismaMocks.prisma.file.deleteMany.mockResolvedValue({ count: 1 })
    expect(await store.delete(ref)).toBe(true)
    prismaMocks.prisma.file.deleteMany.mockResolvedValue({ count: 0 })
    expect(await store.delete(ref)).toBe(false)
  })
})

describe('DiskProjectFileStore', () => {
  const store = new DiskProjectFileStore()
  const ref = { userId: 'u1', projectId: 'p1', path: 'src/app.ts' }

  it('writes through the filesystem runtime under the scoped workspace', async () => {
    fsMocks.runtime.exists.mockResolvedValue(true)
    fsMocks.runtime.getFileInfo.mockResolvedValue({ modified: new Date('2026-06-03T00:00:00.000Z') })
    const record = await store.write(ref, 'content')
    expect(record.content).toBe('content')
    expect(record.path).toBe('/src/app.ts')
    expect(fsMocks.runtime.writeFile).toHaveBeenCalledWith(
      '/ws/p1/src/app.ts',
      'content',
      expect.objectContaining({ createDirectories: true, atomic: true })
    )
  })

  it('reads existing files and returns null for missing ones', async () => {
    fsMocks.runtime.exists.mockResolvedValueOnce(true)
    fsMocks.runtime.readFile.mockResolvedValue({
      content: 'on-disk',
      language: 'typescript',
      modified: new Date('2026-06-04T00:00:00.000Z'),
    })
    expect((await store.read(ref))?.content).toBe('on-disk')

    fsMocks.runtime.exists.mockResolvedValueOnce(false)
    expect(await store.read(ref)).toBeNull()
  })

  it('deletes only when the file exists', async () => {
    fsMocks.runtime.exists.mockResolvedValueOnce(true)
    expect(await store.delete(ref)).toBe(true)
    expect(fsMocks.runtime.delete).toHaveBeenCalledWith('/ws/p1/src/app.ts', expect.objectContaining({ force: true }))

    fsMocks.runtime.exists.mockResolvedValueOnce(false)
    expect(await store.delete(ref)).toBe(false)
  })
})
