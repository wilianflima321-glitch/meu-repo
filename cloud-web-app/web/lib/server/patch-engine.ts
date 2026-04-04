import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { hashContent } from './change-rollback-store'

const execFileAsync = promisify(execFile)

export type DiffResult = {
  diff: string
  beforeHash: string
  afterHash: string
}

async function writeTempFile(dir: string, name: string, content: string): Promise<string> {
  const filePath = path.join(dir, name)
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

export async function generateUnifiedDiff(params: {
  original: string
  modified: string
  filePath?: string
}): Promise<DiffResult> {
  const beforeHash = hashContent(params.original)
  const afterHash = hashContent(params.modified)

  if (params.original === params.modified) {
    return { diff: '', beforeHash, afterHash }
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-diff-'))
  const beforePath = await writeTempFile(tmpDir, 'before.txt', params.original)
  const afterPath = await writeTempFile(tmpDir, 'after.txt', params.modified)

  try {
    const { stdout } = await execFileAsync('git', ['diff', '--no-index', '--text', '--', beforePath, afterPath], {
      timeout: 120_000,
      windowsHide: true,
    })
    const diff = params.filePath
      ? stdout
          .replace(/^diff --git a\/.* b\/.*$/m, `diff --git a/${params.filePath} b/${params.filePath}`)
          .replace(/^--- a\/.*$/m, `--- a/${params.filePath}`)
          .replace(/^\+\+\+ b\/.*$/m, `+++ b/${params.filePath}`)
      : stdout
    return { diff, beforeHash, afterHash }
  } catch (error) {
    throw Object.assign(new Error('DIFF_GENERATION_FAILED'), {
      cause: error,
    })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
