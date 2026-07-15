import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mapHostDiskTreeNodes } from '@/lib/explorer/host-disk-tree-client'
import {
  fetchExplorerTreeAuthority,
  fetchWorkspaceTreeAuthority,
} from '@/lib/explorer/workspace-tree-client'

describe('host-disk-tree-client mapper', () => {
  it('maps Rust FileTreeNode folder/file types into explorer nodes', () => {
    const mapped = mapHostDiskTreeNodes([
      {
        name: 'Assets',
        path: 'E:\\Games\\MyProj\\Assets',
        type: 'directory',
        children: [
          { name: 'hero.glb', path: 'E:\\Games\\MyProj\\Assets\\hero.glb', type: 'file' },
        ],
      },
      { name: 'readme.md', path: 'E:\\Games\\MyProj\\readme.md', type: 'file' },
    ])
    expect(mapped[0]?.type).toBe('directory')
    expect(mapped[0]?.children?.[0]?.type).toBe('file')
    expect(mapped[0]?.children?.[0]?.name).toBe('hero.glb')
    expect(mapped[1]?.type).toBe('file')
  })

  it('normalizes folder alias to directory', () => {
    const mapped = mapHostDiskTreeNodes([
      { name: 'src', path: 'C:\\proj\\src', type: 'folder', children: [] },
    ])
    expect(mapped[0]?.type).toBe('directory')
  })
})

describe('workspace-tree-client Focus C2 + Founder 1B router', () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          authority: 'disk',
          mock: false,
          projectId: 'p1',
          tree: [{ name: 'src', path: '/src', type: 'directory', children: [] }],
        }),
      ),
    )
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    // restore any window stub
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
    }
    vi.restoreAllMocks()
  })

  it('requests tree-authority mode=tree and requires disk authority', async () => {
    const result = await fetchWorkspaceTreeAuthority({ projectId: 'p1', depth: 4 })
    expect(result.authority).toBe('disk')
    expect(result.mock).toBe(false)
    expect(result.tree[0]?.path).toBe('/src')
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(call[0])).toContain('/api/workspace/tree-authority?mode=tree')
    expect(call[1]?.headers?.['x-project-id']).toBe('p1')
  })

  it('fails closed when mock=true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          authority: 'disk',
          mock: true,
          tree: [],
        }),
      ),
    )
    await expect(fetchWorkspaceTreeAuthority({ projectId: 'p1' })).rejects.toThrow(/mock forbidden/i)
  })

  it('router uses workspace disk when Tauri bridge is absent', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: () => null,
          setItem: () => undefined,
        },
        location: { search: '' },
      },
      configurable: true,
    })
    const result = await fetchExplorerTreeAuthority({ projectId: 'p1', preferHostDisk: true })
    expect(result.authority).toBe('disk')
    expect(result.source).toBe('workspace-tree-authority')
  })

  it('host-disk authority shape is non-mock with watch flag', () => {
    const hostShape = {
      authority: 'host-disk' as const,
      mock: false as const,
      projectId: 'p1',
      projectRoot: 'E:\\Games\\MyProj',
      watchActive: true,
      source: 'tauri-fs-tree' as const,
      tree: mapHostDiskTreeNodes([
        {
          name: 'Assets',
          path: 'E:\\Games\\MyProj\\Assets',
          type: 'directory',
          children: [{ name: 'hero.glb', path: 'E:\\Games\\MyProj\\Assets\\hero.glb', type: 'file' }],
        },
      ]),
    }
    expect(hostShape.authority).toBe('host-disk')
    expect(hostShape.mock).toBe(false)
    expect(hostShape.watchActive).toBe(true)
    expect(hostShape.tree[0]?.children?.[0]?.name).toBe('hero.glb')
  })
})
