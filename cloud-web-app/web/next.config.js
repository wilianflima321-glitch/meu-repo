/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config')
const enableStandalone = process.env.NEXT_STANDALONE === '1'

// Some environments inject partial/invalid IPC vars.
// If the pair is incomplete, Next may build invalid revalidateTag URLs (localhost:undefined).
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
    // Keep as empty string (instead of deleting) to avoid downstream
    // env serialization turning `undefined` into the literal string "undefined".
    process.env[key] = ''
  }
}

const ipcPortRaw = resolveFirstValidEnvValue(IPC_PORT_ENV_KEYS)
const ipcKeyRaw = resolveFirstValidEnvValue(IPC_KEY_ENV_KEYS)
const ipcPort = Number.parseInt(ipcPortRaw, 10)
const hasValidIpcConfig = Number.isInteger(ipcPort) && ipcPort > 0 && ipcKeyRaw.length > 0
const IDE_ENTRY_REDIRECTS = [
  { source: '/ai-command', destination: '/ide?entry=ai-command' },
  { source: '/animation-blueprint', destination: '/ide?entry=animation-blueprint' },
  { source: '/blueprint-editor', destination: '/ide?entry=blueprint-editor' },
  { source: '/chat', destination: '/ide?entry=chat' },
  { source: '/debugger', destination: '/ide?entry=debugger' },
  { source: '/editor-hub', destination: '/ide?entry=editor-hub' },
  { source: '/explorer', destination: '/ide?entry=explorer' },
  { source: '/git', destination: '/ide?entry=git' },
  { source: '/landscape-editor', destination: '/ide?entry=landscape-editor' },
  { source: '/level-editor', destination: '/ide?entry=level-editor' },
  { source: '/live-preview', destination: '/ide?entry=live-preview' },
  { source: '/niagara-editor', destination: '/ide?entry=niagara-editor' },
  { source: '/playground', destination: '/ide?entry=playground' },
  { source: '/preview', destination: '/ide?entry=live-preview' },
  { source: '/search', destination: '/ide?entry=search' },
  { source: '/terminal', destination: '/ide?entry=terminal' },
  { source: '/testing', destination: '/ide?entry=testing' },
  { source: '/vr-preview', destination: '/ide?entry=vr-preview' },
]

if (!hasValidIpcConfig) clearIpcEnv()

const nextConfig = {
  ...(enableStandalone ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return IDE_ENTRY_REDIRECTS.map((item) => ({
      source: item.source,
      destination: item.destination,
      permanent: false,
    }))
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    ]

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      })
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  experimental: {
    cpus: 1,
    // Prefer worker threads to avoid child-process spawn restrictions in locked-down environments.
    workerThreads: true,
    webpackBuildWorker: false,
  },
  i18n,
}

module.exports = nextConfig
