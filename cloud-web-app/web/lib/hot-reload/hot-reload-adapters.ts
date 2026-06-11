import { extname } from 'path'

import type { BundlerAdapter, HotReloadServerOptions } from './hot-reload-contracts'
import type { HotReloadServer } from './hot-reload-server'

export function createWebpackAdapter(): BundlerAdapter {
  return {
    name: 'webpack',
    acceptsHMR: (filePath: string) => {
      const ext = extname(filePath).toLowerCase()
      return ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss', '.sass', '.less'].includes(ext)
    },
  }
}

export function createViteAdapter(): BundlerAdapter {
  return {
    name: 'vite',
    acceptsHMR: (filePath: string) => {
      const ext = extname(filePath).toLowerCase()
      return ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.css', '.scss', '.sass', '.less'].includes(ext)
    },
  }
}

export function createEsbuildAdapter(): BundlerAdapter {
  return {
    name: 'esbuild',
    acceptsHMR: (filePath: string) => {
      const ext = extname(filePath).toLowerCase()
      return ['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext)
    },
  }
}

export function createWebpackHotReloadServerWith(
  ServerClass: new (options?: Partial<HotReloadServerOptions>) => HotReloadServer,
  options?: Partial<HotReloadServerOptions>,
): HotReloadServer {
  const server = new ServerClass({ ...options, bundler: 'webpack' })
  server.setBundlerAdapter(createWebpackAdapter())
  return server
}

export function createViteHotReloadServerWith(
  ServerClass: new (options?: Partial<HotReloadServerOptions>) => HotReloadServer,
  options?: Partial<HotReloadServerOptions>,
): HotReloadServer {
  const server = new ServerClass({ ...options, bundler: 'vite' })
  server.setBundlerAdapter(createViteAdapter())
  return server
}

export function createEsbuildHotReloadServerWith(
  ServerClass: new (options?: Partial<HotReloadServerOptions>) => HotReloadServer,
  options?: Partial<HotReloadServerOptions>,
): HotReloadServer {
  const server = new ServerClass({ ...options, bundler: 'esbuild' })
  server.setBundlerAdapter(createEsbuildAdapter())
  return server
}
