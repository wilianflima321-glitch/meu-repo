/**
 * Aethel Engine - WebContainers Bridge
 * Browser-side fallback for preview when E2B is unavailable.
 * Uses WebContainers API for in-browser Node.js runtime.
 */

export type WebContainerState =
  | 'idle'
  | 'booting'
  | 'ready'
  | 'installing'
  | 'running'
  | 'error'
  | 'disposed'

export interface WebContainerFile {
  path: string
  content: string
}

export interface WebContainerBridgeOptions {
  onStateChange?: (state: WebContainerState) => void
  onServerReady?: (url: string, port: number) => void
  onError?: (error: Error) => void
  onOutput?: (data: string) => void
}

export interface WebContainerBridgeAPI {
  state: WebContainerState
  serverUrl: string | null
  boot: () => Promise<void>
  writeFiles: (files: WebContainerFile[]) => Promise<void>
  writeFile: (path: string, content: string) => Promise<void>
  install: () => Promise<void>
  start: (command?: string) => Promise<void>
  restart: () => Promise<void>
  dispose: () => void
}

type WebContainerModule = {
  WebContainer: {
    boot: () => Promise<WebContainerInstance>
  }
}

type WebContainerProcess = {
  output: ReadableStream<string>
  exit: Promise<number>
  kill: () => void
}

type WebContainerInstance = {
  fs: {
    mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
    writeFile: (path: string, content: string) => Promise<void>
  }
  on: (event: 'server-ready', callback: (port: number, url: string) => void) => void
  spawn: (command: string, args: string[]) => Promise<WebContainerProcess>
  teardown: () => void
}

const loadWebContainerModule = async (): Promise<WebContainerModule> => {
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<WebContainerModule>

  return importer('@webcontainer/api')
}

/**
 * Creates a WebContainers bridge for browser-side preview.
 * This is a fallback when E2B sandbox is unavailable.
 * 
 * NOTE: WebContainers requires specific COOP/COEP headers:
 *   Cross-Origin-Embedder-Policy: require-corp
 *   Cross-Origin-Opener-Policy: same-origin
 */
export function createWebContainerBridge(
  options: WebContainerBridgeOptions = {}
): WebContainerBridgeAPI {
  let state: WebContainerState = 'idle'
  let serverUrl: string | null = null
  let webcontainerInstance: WebContainerInstance | null = null
  let serverProcess: WebContainerProcess | null = null

  const setState = (newState: WebContainerState) => {
    state = newState
    options.onStateChange?.(newState)
  }

  const boot = async () => {
    if (state !== 'idle' && state !== 'error') return

    try {
      setState('booting')

      // Keep WebContainers optional so builds do not fail when the package is absent.
      const { WebContainer } = await loadWebContainerModule()
      webcontainerInstance = await WebContainer.boot()

      webcontainerInstance.on('server-ready', (port: number, url: string) => {
        serverUrl = url
        options.onServerReady?.(url, port)
      })

      setState('ready')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState('error')
      options.onError?.(error)
    }
  }

  const writeFiles = async (files: WebContainerFile[]) => {
    if (!webcontainerInstance) throw new Error('WebContainer not booted')

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean)
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/')
        await webcontainerInstance.fs.mkdir(dir, { recursive: true })
      }
      await webcontainerInstance.fs.writeFile(file.path, file.content)
    }
  }

  const writeFile = async (path: string, content: string) => {
    await writeFiles([{ path, content }])
  }

  const install = async () => {
    if (!webcontainerInstance) throw new Error('WebContainer not booted')

    setState('installing')
    try {
      const installProcess = await webcontainerInstance.spawn('npm', ['install'])

      installProcess.output.pipeTo(
        new WritableStream({
          write(data: string) {
            options.onOutput?.(data)
          },
        })
      )

      const exitCode = await installProcess.exit
      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`)
      }
      setState('ready')
    } catch (err) {
      setState('error')
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const start = async (command = 'npm run dev') => {
    if (!webcontainerInstance) throw new Error('WebContainer not booted')

    setState('running')
    try {
      const [cmd, ...args] = command.split(' ')
      serverProcess = await webcontainerInstance.spawn(cmd, args)

      serverProcess.output.pipeTo(
        new WritableStream({
          write(data: string) {
            options.onOutput?.(data)
          },
        })
      )
    } catch (err) {
      setState('error')
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const restart = async () => {
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }
    serverUrl = null
    await start()
  }

  const dispose = () => {
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }
    if (webcontainerInstance) {
      webcontainerInstance.teardown()
      webcontainerInstance = null
    }
    serverUrl = null
    setState('disposed')
  }

  return {
    get state() { return state },
    get serverUrl() { return serverUrl },
    boot,
    writeFiles,
    writeFile,
    install,
    start,
    restart,
    dispose,
  }
}
