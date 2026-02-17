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

const ipcPortRaw = normalizeEnvValue(process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT)
const ipcKeyRaw = normalizeEnvValue(process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY)
const ipcPort = Number.parseInt(ipcPortRaw, 10)
const hasValidIpcConfig = Number.isInteger(ipcPort) && ipcPort > 0 && ipcKeyRaw.length > 0

if (!hasValidIpcConfig) {
  delete process.env.__NEXT_INCREMENTAL_CACHE_IPC_PORT
  delete process.env.__NEXT_INCREMENTAL_CACHE_IPC_KEY
}

const nextConfig = {
  ...(enableStandalone ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  i18n,
}

module.exports = nextConfig
