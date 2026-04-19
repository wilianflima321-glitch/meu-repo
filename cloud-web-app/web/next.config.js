/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config')
const enableStandalone = process.env.NEXT_STANDALONE === '1'

// Security Headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  }
]

// Some environments inject partial/invalid IPC vars.
const normalizeEnvValue = (value) => {
  if (value === undefined || value === null) return ''
  const normalized = String(value).trim()
  const lower = normalized.toLowerCase()
  if (!normalized || lower === 'undefined' || lower === 'null') return ''
  return normalized
}

const IPC_PORT_ENV_KEYS = [
  '__NEXT_INCREMENTAL_CACHE_IPC_PORT',
  '__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_PORT',
]
const IPC_KEY_ENV_KEYS = [
  '__NEXT_INCREMENTAL_CACHE_IPC_KEY',
  '__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_KEY',
]

const resolveFirstValidEnvValue = (keys) => {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key])
    if (value) return value
  }
  return ''
}

const clearIpcEnv = () => {
  for (const key of [...IPC_PORT_ENV_KEYS, ...IPC_KEY_ENV_KEYS]) {
    process.env[key] = ''
    delete process.env[key]
  }
  // Defensive: Next internals sometimes read these keys after config normalization.
  process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT = ''
  process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY = ''
  process.env.__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_PORT = ''
  process.env.__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_KEY = ''
}

const ipcPortRaw = resolveFirstValidEnvValue(IPC_PORT_ENV_KEYS)
const ipcKeyRaw = resolveFirstValidEnvValue(IPC_KEY_ENV_KEYS)
const ipcPort = Number.parseInt(ipcPortRaw, 10)
const hasValidIpcConfig = Number.isInteger(ipcPort) && ipcPort > 0 && ipcKeyRaw.length > 0

if (!hasValidIpcConfig) clearIpcEnv()

const routeRedirects = [
  ['/ai-command', '/ide?entry=ai-command'],
  ['/animation-blueprint', '/ide?entry=animation-blueprint'],
  ['/blueprint-editor', '/ide?entry=blueprint-editor'],
  ['/chat', '/ide?entry=chat'],
  ['/dashboard/legacy', '/dashboard?legacy=1'],
  ['/debugger', '/ide?entry=debugger'],
  ['/docs/changelog', '/docs#changelog'],
  ['/docs/community', '/docs#community'],
  ['/docs/support', '/docs#support'],
  ['/editor-hub', '/ide'],
  ['/explorer', '/ide?entry=explorer'],
  ['/git', '/ide?entry=git'],
  ['/landscape-editor', '/ide?entry=landscape-editor'],
  ['/level-editor', '/ide?entry=level-editor'],
  ['/live-preview', '/ide?entry=live-preview'],
  ['/niagara-editor', '/ide?entry=niagara-editor'],
  ['/playground', '/ide?entry=playground'],
  ['/preview', '/ide?entry=live-preview'],
  ['/search', '/ide?entry=search'],
  ['/team', '/contact-sales'],
  ['/terminal', '/ide?entry=terminal'],
  ['/testing', '/ide?entry=testing'],
  ['/vr-preview', '/ide?entry=vr-preview'],
]

const nextConfig = {
  ...(enableStandalone ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return routeRedirects.map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }))
  },
}

module.exports = nextConfig
