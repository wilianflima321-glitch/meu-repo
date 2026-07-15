import { spawn, type ChildProcess } from 'child_process'

export class GitCommandRunner {
  private readonly repoPath: string
  private readonly gitPath: string
  private readonly runningProcesses: Map<string, ChildProcess> = new Map()

  constructor(repoPath: string, gitPath: string = 'git') {
    this.repoPath = repoPath
    this.gitPath = gitPath
  }

  async runCommand(
    args: string[],
    options: { cwd?: string; timeout?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    const cwd = options.cwd || this.repoPath
    const timeout = options.timeout || 30000

    return new Promise((resolve, reject) => {
      const proc = spawn(this.gitPath, args, {
        cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const id = `git_${Date.now()}`
      this.runningProcesses.set(id, proc)

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timer = setTimeout(() => {
        proc.kill('SIGTERM')
        reject(new Error(`Git command timed out: git ${args.join(' ')}`))
      }, timeout)

      proc.on('close', (code) => {
        clearTimeout(timer)
        this.runningProcesses.delete(id)

        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(stderr || `Git command failed with code ${code}`))
        }
      })

      proc.on('error', (error) => {
        clearTimeout(timer)
        this.runningProcesses.delete(id)
        reject(error)
      })
    })
  }

  cancel(): void {
    for (const proc of this.runningProcesses.values()) {
      proc.kill('SIGTERM')
    }
    this.runningProcesses.clear()
  }
}
