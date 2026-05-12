import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = process.cwd()

function collectStories(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectStories(fullPath)
    return entry.name.endsWith('.stories.tsx') ? [fullPath] : []
  })
}

describe('Storybook design-system contract', () => {
  it('keeps a broad component catalogue available for review', () => {
    const stories = collectStories(join(WEB_ROOT, 'components'))

    expect(stories.length).toBeGreaterThanOrEqual(30)
  })

  it('resolves the app alias inside Storybook Vite builds', () => {
    const storybookConfigPath = join(WEB_ROOT, '.storybook', 'main.ts')
    const storybookConfig = readFileSync(storybookConfigPath, 'utf8')

    expect(existsSync(storybookConfigPath)).toBe(true)
    expect(storybookConfig).toContain('viteFinal')
    expect(storybookConfig).toContain("'@': resolve(__dirname, '..')")
  })
})
