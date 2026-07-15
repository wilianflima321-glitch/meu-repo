import { describe, expect, it } from 'vitest'

import {
  findProjectScaffold,
  getScaffoldTotalSize,
  listProjectScaffolds,
  PROJECT_SCAFFOLDS,
} from '@/lib/project-scaffolds'

describe('project scaffolds', () => {
  it('covers app, API, mobile, game, film and blank first-value paths', () => {
    expect(PROJECT_SCAFFOLDS.map((scaffold) => scaffold.id)).toEqual(
      expect.arrayContaining([
        'nextjs-saas',
        'react-vite',
        'api-express',
        'react-native-companion',
        'game-3d',
        'film-story',
        'blank',
      ]),
    )
  })

  it('ships real files instead of placeholder-only template metadata', () => {
    for (const scaffold of PROJECT_SCAFFOLDS) {
      expect(scaffold.files.length).toBeGreaterThan(0)
      expect(getScaffoldTotalSize(scaffold)).toBeGreaterThan(0)
      expect(scaffold.files.every((file) => file.path.startsWith('/'))).toBe(true)
      expect(scaffold.files.every((file) => file.content.trim().length > 0)).toBe(true)
    }
  })

  it('exposes safe metadata for public lists without file contents', () => {
    const items = listProjectScaffolds()

    expect(items.length).toBe(PROJECT_SCAFFOLDS.length)
    expect(items[0]).toHaveProperty('fileCount')
    expect(items[0]).not.toHaveProperty('files')
  })

  it('resolves game and film scaffolds to the correct Studio surfaces', () => {
    expect(findProjectScaffold('game-3d')?.recommendedStudioSurface).toBe('/studio/level')
    expect(findProjectScaffold('film-story')?.recommendedStudioSurface).toBe('/studio/film')
  })
})
