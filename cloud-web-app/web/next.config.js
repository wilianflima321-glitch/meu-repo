/** @type {import('next').NextConfig} */
const os = require('node:os')
const { i18n } = require('./next-i18next.config')
const enableStandalone = process.env.NEXT_STANDALONE === '1'
const enableOutputFileTracing = enableStandalone || process.env.AETHEL_OUTPUT_FILE_TRACING === '1'
const defaultBuildCpus = Math.max(2, Math.min(4, typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length))
const configuredBuildCpus = Number.parseInt(process.env.AETHEL_NEXT_BUILD_CPUS || String(defaultBuildCpus), 10)
const buildCpus = Number.isFinite(configuredBuildCpus) && configuredBuildCpus > 0 ? configuredBuildCpus : 2
const turboFlag = String(process.env.TURBOPACK || '').trim().toLowerCase()
if (['0', 'false', 'no', 'off'].includes(turboFlag)) {
  delete process.env.TURBOPACK
}
const serverComponentExternalPackages = [
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-request-presigner',
  '@prisma/client',
  'e2b',
  'ioredis',
  'node-pty',
  'redis',
  'ws',
]

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
  // This repository has hundreds of route handlers. Next's node-file-trace
  // pass can dominate local/CI compile time, so keep tracing opt-in unless
  // we are explicitly producing a standalone deploy bundle.
  outputFileTracing: enableOutputFileTracing,
  reactStrictMode: true,
  poweredByHeader: false,
  // Next/Image optimization re-enabled (audit V5 finding #3.1).
  // `unoptimized: true` used to disable WebP/AVIF, responsive srcset and
  // Core Web Vitals compliance. `remotePatterns` keeps external avatars
  // (pravatar.cc, GitHub avatars, etc.) working through the loader.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: '**.stripe.com' },
    ],
    // Sensible defaults for a Next 14 + Tailwind app; tweak if LCP regresses.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  typescript: { ignoreBuildErrors: false },
  transpilePackages: ['geist'],
  experimental: {
    cpus: buildCpus,
    serverComponentsExternalPackages: serverComponentExternalPackages,
    // Windows builds were hanging and surfacing unstable prerender failures
    // with worker threads enabled in this workspace. Keep the build path
    // deterministic until production parity is proven again.
    workerThreads: false,
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@tauri-apps/api/http': false,
        '@tauri-apps/api/core': false,
        '@tauri-apps/api/event': false,
      }
    } else {
      config.externals.push({
        '@tauri-apps/api/http': 'commonjs @tauri-apps/api/http',
        '@tauri-apps/api/core': 'commonjs @tauri-apps/api/core',
        '@tauri-apps/api/event': 'commonjs @tauri-apps/api/event',
      })
    }
    return config
  },
}

// Round 81 — opt-in bundle analyzer.
// Enable with: ANALYZE=1 npm run build
// Writes HTML reports to .next/analyze/*.html so reviewers can inspect chunks.
let finalConfig = nextConfig
if (process.env.ANALYZE === '1' || process.env.ANALYZE === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
      openAnalyzer: false,
    })
    finalConfig = withBundleAnalyzer(nextConfig)
  } catch (err) {
    // Dependency is optional — fall back to the plain config if missing.
    console.warn('[next.config] ANALYZE=1 but @next/bundle-analyzer is not installed — skipping analyzer wrap.')
  }
}

module.exports = finalConfig
